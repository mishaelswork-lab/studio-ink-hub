import { requireInternal } from "../_shared/guard.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Search queries for finding tattoo artists in India
const SEARCH_QUERIES = [
  "tattoo artist India Instagram",
  "best tattoo studio Mumbai",
  "tattoo artist Delhi portfolio",
  "tattoo studio Bangalore",
  "tattoo artist Hyderabad",
  "tattoo studio Pune",
  "tattoo artist Chennai",
  "tattoo studio Kolkata",
  "tattoo artist Jaipur",
  "tattoo studio Goa",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const _g = await requireInternal(req);
  if (_g.response) return _g.response;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get existing onboarded artist Instagram URLs to skip them
    const { data: existingArtists } = await supabase
      .from("artists")
      .select("instagram_url, name")
      .not("instagram_url", "is", null);

    const existingUrls = new Set(
      (existingArtists || []).map(a => a.instagram_url?.toLowerCase()).filter(Boolean)
    );
    const existingNames = new Set(
      (existingArtists || []).map(a => a.name?.toLowerCase()).filter(Boolean)
    );

    // Get already-contacted leads to avoid duplicates
    const { data: existingLeads } = await supabase
      .from("outreach_leads")
      .select("instagram_url, name");

    const leadUrls = new Set(
      (existingLeads || []).map(l => l.instagram_url?.toLowerCase()).filter(Boolean)
    );
    const leadNames = new Set(
      (existingLeads || []).map(l => l.name?.toLowerCase()).filter(Boolean)
    );

    // Use a web search approach — in production, integrate a proper scraping API
    // For now, we simulate lead discovery with known Indian tattoo hubs
    const indianCities = [
      "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Pune",
      "Chennai", "Kolkata", "Jaipur", "Goa", "Ahmedabad",
      "Lucknow", "Chandigarh", "Kochi", "Indore", "Bhopal",
    ];

    const newLeads: Array<{
      name: string;
      city: string;
      source_url: string;
      instagram_url?: string;
    }> = [];

    // This function would be enhanced with actual web scraping (Firecrawl, etc.)
    // For now it logs the intent and creates placeholder structure
    console.log(`Scraper running — checking ${indianCities.length} cities`);
    console.log(`Existing artists: ${existingUrls.size}, Existing leads: ${leadUrls.size}`);

    // Insert any discovered leads that aren't already onboarded or contacted
    const leadsToInsert = newLeads.filter(lead => {
      const nameKey = lead.name?.toLowerCase();
      const urlKey = lead.instagram_url?.toLowerCase();
      return (
        (!nameKey || (!existingNames.has(nameKey) && !leadNames.has(nameKey))) &&
        (!urlKey || (!existingUrls.has(urlKey) && !leadUrls.has(urlKey)))
      );
    });

    if (leadsToInsert.length > 0) {
      const { error } = await supabase.from("outreach_leads").insert(leadsToInsert);
      if (error) console.error("Insert leads error:", error);
    }

    console.log(`Scraper complete — ${leadsToInsert.length} new leads added`);

    return new Response(JSON.stringify({
      success: true,
      new_leads: leadsToInsert.length,
      total_existing_artists: existingUrls.size,
      total_existing_leads: leadUrls.size,
      cities_checked: indianCities,
      message: "Connect Firecrawl connector for full web scraping capabilities",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Scraper error:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
