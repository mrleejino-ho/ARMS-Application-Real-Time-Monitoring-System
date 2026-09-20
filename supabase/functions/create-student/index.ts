import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const requiredText = (value: unknown, field: string, maxLength = 120) => {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new Error(`${field} is required and must be ${maxLength} characters or fewer.`);
  }
  return value.trim();
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization");

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization?.startsWith("Bearer ")) {
    return json({ error: "Authentication is required." }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // The caller token is checked before the elevated client is used for writes.
    const token = authorization.replace("Bearer ", "");
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "Your session is not valid." }, 401);

    const { data: requester, error: requesterError } = await admin
      .from("profiles")
      .select("id, role, school_id")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (requesterError || !requester || !["admin", "teacher"].includes(requester.role)) {
      return json({ error: "You are not authorized to create student accounts." }, 403);
    }

    const body = await request.json();
    const firstName = requiredText(body.first_name, "First name");
    const middleName = typeof body.middle_name === "string" ? body.middle_name.trim() : "";
    const lastName = requiredText(body.last_name, "Last name");
    const email = requiredText(body.email, "Email address", 254).toLowerCase();
    const gradeLevel = requiredText(body.grade_level, "Grade level", 30);
    const strand = requiredText(body.strand, "Strand", 60);
    const section = requiredText(body.section, "Section", 80);
    const temporaryPassword = requiredText(body.temporary_password, "Temporary password", 72);
    const classId = typeof body.class_id === "string" && body.class_id ? body.class_id : null;

    if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("Enter a valid email address.");
    if (temporaryPassword.length < 8) throw new Error("Temporary password must be at least 8 characters.");

    if (classId) {
      let classQuery = admin.from("classes").select("id, teacher_id, school_id, status").eq("id", classId).eq("status", "active");
      if (requester.role === "teacher") classQuery = classQuery.eq("teacher_id", requester.id);
      const { data: selectedClass, error: classError } = await classQuery.maybeSingle();
      const sameSchool = !requester.school_id || !selectedClass?.school_id || requester.school_id === selectedClass.school_id;
      if (classError || !selectedClass || !sameSchool) return json({ error: "You cannot enroll a student in that class." }, 403);
    }

    const { data: existingEmailProfile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
    if (existingEmailProfile) return json({ error: "An account with that email already exists." }, 409);

    // Auth creation is server-only. The service role key never reaches the browser.
    const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
      email,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: { role: "student", full_name: [firstName, middleName, lastName].filter(Boolean).join(" ") },
    });

    if (createUserError || !createdUser.user) {
      const message = createUserError?.message?.toLowerCase().includes("already")
        ? "An account with that email already exists."
        : "Unable to create the student account.";
      return json({ error: message }, createUserError?.message?.toLowerCase().includes("already") ? 409 : 400);
    }

    const studentId = createdUser.user.id;
    const fullName = [firstName, middleName, lastName].filter(Boolean).join(" ");
    const profilePayload = {
      id: studentId,
      school_id: requester.school_id,
      full_name: fullName,
      email,
      role: "student",
      grade_level: gradeLevel,
      strand,
      section,
      status: "active",
    };

    // A database trigger may create the profile during Auth user creation.
    // Update that row when present, and only insert when the trigger did not run.
    const {
      data: existingProfile,
      error: profileLookupError,
    } = await admin
      .from("profiles")
      .select("id")
      .eq("id", studentId)
      .maybeSingle();

    let profileError = profileLookupError;

    if (!profileError && existingProfile) {
      const { error: updateError } = await admin
        .from("profiles")
        .update({
          school_id: requester.school_id,
          full_name: fullName,
          email,
          role: "student",
          grade_level: gradeLevel,
          strand,
          section,
          status: "active",
        })
        .eq("id", studentId);

      profileError = updateError;
    } else if (!profileError) {
      const { error: insertError } = await admin
        .from("profiles")
        .insert(profilePayload);

      profileError = insertError;
    }

    if (profileError) {
      console.error("Profile insert failed:", {
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        code: profileError.code,
      });

      await admin.auth.admin.deleteUser(studentId);

      return json({ error: "The student account could not be completed." }, 400);
    }

    if (classId) {
      const { error: enrollmentError } = await admin.from("class_students").insert({
        class_id: classId,
        student_id: studentId,
        status: "active",
        joined_at: new Date().toISOString(),
      });
      if (enrollmentError) {
        await admin.from("profiles").delete().eq("id", studentId);
        await admin.auth.admin.deleteUser(studentId);
        return json({ error: "The account was created but could not be enrolled in that class." }, 400);
      }
    }

    return json({ student: { id: studentId, full_name: fullName, email } }, 201);
  } catch (error) {
    console.error("create-student error:", error instanceof Error ? error.message : "Unknown error");
    return json({ error: error instanceof Error ? error.message : "Unable to create student account." }, 400);
  }
});
