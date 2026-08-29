type TradFiCategory =
  | "forex"
  | "stocks"
  | "indices"
  | "metals"
  | "commodities";

type Contract = {
  symbol?: string;
  asset?: string;
  currency?: string;

  [key: string]: unknown;
};

type AssetsBinding = {
  fetch(
    request: Request
  ): Promise<Response>;
};

type Env = {
  ASSETS: AssetsBinding;
};

const BASE =
  "https://open-api.bingx.com";

/* =========================================================
   CLASSIFICATION
   ========================================================= */

const stockSymbols =
  new Set([
    "AAPL",
    "NVDA",
    "TSLA",
    "MSFT",
    "META",
    "GOOGL",
    "GOOG",
    "AMZN",
    "NFLX",
    "AMD",
    "INTC",
    "BA",
    "COIN",
    "MSTR",
    "PLTR",
    "BABA",
    "NIO",
    "PDD",
    "TSM",
    "AVGO",
    "ORCL",
    "CRM",
    "UBER",
    "DIS",
    "PYPL",
    "SHOP",
    "SNOW",
  ]);

const indexTokens = [
  "SPX",
  "SP500",
  "S&P",
  "NASDAQ",
  "NDX",
  "DJI",
  "DOW",
  "US30",
  "US100",
  "US500",
  "NIKKEI",
  "N225",
  "DAX",
  "FTSE",
  "HK50",
  "HSI",
  "CAC",
];

const metalTokens = [
  "GOLD",
  "SILVER",
  "XAU",
  "XAG",
  "XPT",
  "XPD",
];

const commodityTokens = [
  "OIL",
  "WTI",
  "BRENT",
  "NATGAS",
  "GAS",
  "COPPER",
  "ZINC",
  "XZN",
  "COCOA",
  "SOY",
  "CORN",
  "WHEAT",
  "COFFEE",
  "SUGAR",
];

const fiatCodes = [
  "USD",
  "EUR",
  "GBP",
  "JPY",
  "AUD",
  "CAD",
  "CHF",
  "NZD",
  "CNH",
  "HKD",
  "SGD",
  "NOK",
  "SEK",
  "MXN",
  "ZAR",
  "TRY",
];

/* =========================================================
   HELPERS
   ========================================================= */

function json(
  data: unknown,
  status = 200
) {
  return new Response(
    JSON.stringify(data),
    {
      status,

      headers: {
        "content-type":
          "application/json; charset=utf-8",

        "cache-control":
          "public, max-age=5, s-maxage=5",

        "access-control-allow-origin":
          "*",
      },
    }
  );
}

function norm(
  value: string
) {
  return value
    .toUpperCase()
    .replace(
      /[^A-Z0-9]/g,
      ""
    );
}

function classifyTradFi(
  contract: Contract
): {
  marketType:
    | "crypto"
    | "tradfi";

  tradfiCategory?:
    TradFiCategory;

  aliases?: string[];
} {
  const symbol =
    String(
      contract.symbol ||
        ""
    );

  const asset =
    String(
      contract.asset ||
        symbol.replace(
          /-USDT$/i,
          ""
        )
    );

  const normalized =
    norm(asset);

  const aliases =
    new Set<string>([
      asset,
      symbol,
      normalized,
    ]);

  /*
   * GOLD(XAU)
   * SILVER(XAG)
   * Zinc(XZN)
   */

  const bracketMatch =
    asset.match(
      /\(([A-Za-z0-9]+)\)/
    );

  if (
    bracketMatch?.[1]
  ) {
    aliases.add(
      bracketMatch[1].toUpperCase()
    );
  }

  /* METALS */

  if (
    metalTokens.some(
      (token) =>
        normalized.includes(
          token
        )
    )
  ) {
    if (
      normalized.includes(
        "XAU"
      )
    ) {
      aliases.add(
        "XAUUSD"
      );
    }

    if (
      normalized.includes(
        "XAG"
      )
    ) {
      aliases.add(
        "XAGUSD"
      );
    }

    return {
      marketType:
        "tradfi",

      tradfiCategory:
        "metals",

      aliases:
        [...aliases],
    };
  }

  /* COMMODITIES */

  if (
    commodityTokens.some(
      (token) =>
        normalized.includes(
          token
        )
    )
  ) {
    return {
      marketType:
        "tradfi",

      tradfiCategory:
        "commodities",

      aliases:
        [...aliases],
    };
  }

  /* INDICES */

  if (
    indexTokens.some(
      (token) =>
        normalized.includes(
          norm(token)
        )
    )
  ) {
    return {
      marketType:
        "tradfi",

      tradfiCategory:
        "indices",

      aliases:
        [...aliases],
    };
  }

  /* STOCKS */

  if (
    stockSymbols.has(
      normalized
    )
  ) {
    return {
      marketType:
        "tradfi",

      tradfiCategory:
        "stocks",

      aliases:
        [...aliases],
    };
  }

  /*
   * FOREX
   *
   * EURUSD
   * GBPUSD
   * USDJPY
   */

  if (
    normalized.length ===
    6
  ) {
    const left =
      normalized.slice(
        0,
        3
      );

    const right =
      normalized.slice(
        3,
        6
      );

    if (
      fiatCodes.includes(
        left
      ) &&
      fiatCodes.includes(
        right
      )
    ) {
      aliases.add(
        `${left}/${right}`
      );

      return {
        marketType:
          "tradfi",

        tradfiCategory:
          "forex",

        aliases:
          [...aliases],
      };
    }
  }

  return {
    marketType:
      "crypto",

    aliases:
      [...aliases],
  };
}

/* =========================================================
   BINGX
   ========================================================= */

async function bingx(
  path: string,
  params: Record<
    string,
    string
  > = {}
) {
  const url =
    new URL(
      BASE + path
    );

  Object.entries(
    params
  ).forEach(
    ([key, value]) => {
      url.searchParams.set(
        key,
        value
      );
    }
  );

  const response =
    await fetch(
      url.toString(),
      {
        headers: {
          accept:
            "application/json",
        },
      }
    );

  const text =
    await response.text();

  let payload:
    | Record<
        string,
        unknown
      >
    | null = null;

  try {
    payload =
      JSON.parse(
        text
      ) as Record<
        string,
        unknown
      >;
  } catch {
    throw new Error(
      `BingX returned non-JSON (${response.status})`
    );
  }

  if (!response.ok) {
    throw new Error(
      `BingX HTTP ${response.status}`
    );
  }

  return payload;
}

/* =========================================================
   WORKER
   ========================================================= */

export default {
  async fetch(
    request: Request,
    env: Env
  ): Promise<Response> {
    const url =
      new URL(
        request.url
      );

    /*
     * API MUST BE CHECKED
     * BEFORE SPA ASSETS.
     */

    if (
      url.pathname ===
      "/api/bingx"
    ) {
      const action =
        url.searchParams.get(
          "action"
        ) ||
        "contracts";

      const rawSymbol =
        (
          url.searchParams.get(
            "symbol"
          ) || ""
        )
          .toUpperCase()
          .trim();

      const symbol =
        rawSymbol
          .replace(
            "/",
            "-"
          )
          .replace(
            "_",
            "-"
          )
          .replace(
            "-PERP",
            ""
          );

      try {
        /* CONTRACTS */

        if (
          action ===
          "contracts"
        ) {
          const payload =
            await bingx(
              "/openApi/swap/v2/quote/contracts"
            );

          const rawData =
            payload.data;

          if (
            Array.isArray(
              rawData
            )
          ) {
            payload.data =
              rawData.map(
                (
                  contract
                ) => {
                  const typed =
                    contract as Contract;

                  return {
                    ...typed,

                    ...classifyTradFi(
                      typed
                    ),
                  };
                }
              );
          }

          return json(
            payload
          );
        }

        /* TICKER */

        if (
          action ===
          "ticker"
        ) {
          if (!symbol) {
            return json(
              {
                code: 400,
                msg:
                  "Некорректный тикер",
              },
              400
            );
          }

          const payload =
            await bingx(
              "/openApi/swap/v2/quote/ticker",
              {
                symbol,
              }
            );

          return json(
            payload
          );
        }

        /* BOOK */

        if (
          action ===
          "book"
        ) {
          if (!symbol) {
            return json(
              {
                code: 400,
                msg:
                  "Некорректный тикер",
              },
              400
            );
          }

          const payload =
            await bingx(
              "/openApi/swap/v2/quote/bookTicker",
              {
                symbol,
              }
            );

          return json(
            payload
          );
        }

        return json(
          {
            code: 404,
            msg:
              "Unknown action",
          },
          404
        );
      } catch (error) {
        return json(
          {
            code: 502,

            msg:
              error instanceof
              Error
                ? error.message
                : "BingX request failed",
          },
          502
        );
      }
    }

    /*
     * EVERYTHING ELSE = REACT APP
     */

    return env.ASSETS.fetch(
      request
    );
  },
};