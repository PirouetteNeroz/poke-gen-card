import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function fetchAPI(url: string): Promise<Response> {
  console.log(`Fetching: ${url}`);
  return await fetch(url, {
    headers: { "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { endpoint } = await req.json();

    if (!endpoint) {
      return new Response(
        JSON.stringify({ error: "Missing endpoint parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const baseURL = "https://api.pokemontcg.io/v2";
    
    // Build the full URL properly
    const fullUrl = `${baseURL}${endpoint}`;
    
    console.log("Final URL:", fullUrl);
    
    const response = await fetchAPI(fullUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Pokemon TCG API error:", response.status, errorText.substring(0, 300));
      
      // Check if it's a timeout or server error
      if (response.status >= 500) {
        return new Response(
          JSON.stringify({ 
            error: `L'API Pokémon TCG est temporairement indisponible (${response.status}). Veuillez réessayer dans quelques instants.`,
            status: response.status
          }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        details: "L'API Pokémon TCG pourrait être temporairement indisponible. Veuillez réessayer."
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
