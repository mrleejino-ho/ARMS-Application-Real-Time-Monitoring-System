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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization");

  if (!supabaseUrl || !serviceRoleKey || !authorization?.startsWith("Bearer ")) {
    return json({ error: "Authentication is required." }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const token = authorization.replace("Bearer ", "");
    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "Your session is not valid." }, 401);

    const { data: requester, error: requesterError } = await admin
      .from("profiles")
      .select("id, role, status")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (
      requesterError ||
      !requester ||
      requester.status !== "active" ||
      !["admin", "teacher"].includes(requester.role)
    ) {
      return json({ error: "You are not authorized to change application restrictions." }, 403);
    }

    const body = await request.json();
    const applicationId = typeof body.application_id === "string" ? body.application_id : "";
    const restricted = body.restricted;

    if (!applicationId || typeof restricted !== "boolean") {
      return json({ error: "application_id and restricted are required." }, 400);
    }

    const { data: application, error: applicationError } = await admin
      .from("applications")
      .select("id, app_name, package_name")
      .eq("id", applicationId)
      .maybeSingle();

    if (applicationError || !application) {
      return json({ error: "Application not found." }, 404);
    }

    const { error: policyError } = await admin
      .from("applications")
      .update({
        is_restricted: restricted,
        updated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    if (policyError) {
      console.error("Application policy update failed:", policyError);
      return json({ error: "The application policy could not be saved." }, 400);
    }

    if (restricted) {
      const { data: students, error: studentsError } = await admin
        .from("profiles")
        .select("id")
        .eq("role", "student")
        .eq("status", "active");

      if (studentsError) {
        console.error("Active student lookup failed:", studentsError);
        await admin.from("applications").update({ is_restricted: false }).eq("id", applicationId);
        return json({ error: "Active students could not be loaded." }, 400);
      }

      const rows = (students || []).map((student) => ({
        student_id: student.id,
        application_id: application.id,
        package_name: application.package_name,
        app_label: application.app_name,
        is_active: true,
        updated_at: new Date().toISOString(),
      }));

      if (rows.length > 0) {
        const { error: syncError } = await admin
          .from("restricted_apps")
          .upsert(rows, { onConflict: "student_id,application_id" });

        if (syncError) {
          console.error("Restriction synchronization failed:", syncError);
          await admin.from("applications").update({ is_restricted: false }).eq("id", applicationId);
          return json({ error: "Student restrictions could not be synchronized." }, 400);
        }
      }
    } else {
      const { error: deactivateError } = await admin
        .from("restricted_apps")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("application_id", applicationId);

      if (deactivateError) {
        console.error("Restriction deactivation failed:", deactivateError);
        await admin.from("applications").update({ is_restricted: true }).eq("id", applicationId);
        return json({ error: "Existing student restrictions could not be deactivated." }, 400);
      }
    }

    return json({
      application_id: application.id,
      restricted,
      message: restricted
        ? "Application restricted for active students."
        : "Application allowed during class.",
    });
  } catch (error) {
    console.error("toggle-application-restriction error:", error instanceof Error ? error.message : "Unknown error");
    return json({ error: "Unable to update application restrictions." }, 400);
  }
});
