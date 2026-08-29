const BASE = "https://open-api.bingx.com";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=5, s-maxage=5",
      "access-control-allow-origin": "*",
    },
  });
}

function validSymbol(value: string) {
  return /^[A-Z0-9.-]{2,40}$/.test(value);
}

async function bingx(
  path: string,
  params: Record<string, string> = {}
) {
  const url = new URL(BASE + path);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString(), {
    headers: {
      accept: "application/json",
    },
  });

  const text = await response.text();

  let payload: unknown;

  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`BingX returned non-JSON (${response.status})`);
  }

  if (!response.ok) {
    throw new Error(`BingX HTTP ${response.status}`);
  }

  return payload;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Все обычные адреса сайта обрабатывает Vite/Cloudflare Assets.
    // Worker нужен нам только для BingX API.
    if (url.pathname !== "/api/bingx") {
      return new Response("Not Found", { status: 404 });
    }

    const action = url.searchParams.get("action") || "contracts";

    const rawSymbol = (
      url.searchParams.get("symbol") || ""
    )
      .toUpperCase()
      .trim();

    const symbol = rawSymbol
      .replace("/", "-")
      .replace("_", "-")
      .replace("-PERP", "");

    try {
      if (action === "contracts") {
        const payload = await bingx(
          "/openApi/swap/v2/quote/contracts"
        );

        return json(payload);
      }

      if (action === "ticker") {
        if (
          !symbol ||
          !validSymbol(symbol) ||
          !symbol.includes("-")
        ) {
          return json(
            {
              code: 400,
              msg: "Некорректный тикер",
            },
            400
          );
        }

        const payload = await bingx(
          "/openApi/swap/v2/quote/ticker",
          { symbol }
        );

        return json(payload);
      }

      if (action === "book") {
        if (
          !symbol ||
          !validSymbol(symbol) ||
          !symbol.includes("-")
        ) {
          return json(
            {
              code: 400,
              msg: "Некорректный тикер",
            },
            400
          );
        }

        const payload = await bingx(
          "/openApi/swap/v2/quote/bookTicker",
          { symbol }
        );

        return json(payload);
      }

      return json(
        {
          code: 404,
          msg: "Unknown action",
        },
        404
      );
    } catch (error) {
      return json(
        {
          code: 502,
          msg:
            error instanceof Error
              ? error.message
              : "BingX request failed",
        },
        502
      );
    }
  },
};