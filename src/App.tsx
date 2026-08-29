import { useEffect, useMemo, useRef, useState } from "react";

type Market = "crypto" | "tradfi";
type Side = "LONG" | "SHORT";
type FeeSide = "Taker" | "Maker";

type TradFiCategory =
  | "all"
  | "forex"
  | "stocks"
  | "indices"
  | "metals"
  | "commodities";

type Contract = {
  symbol: string;
  asset?: string;
  currency?: string;

  pricePrecision?: number;
  quantityPrecision?: number;

  makerFeeRate?: number;
  takerFeeRate?: number;

  tradeMinQuantity?: number;
  tradeMinUSDT?: number;

  maxLongLeverage?: number;
  maxShortLeverage?: number;

  status?: number;

  marketType?: "crypto" | "tradfi";
  tradfiCategory?: TradFiCategory;

  aliases?: string[];
};

type NumberInputProps = {
  value: string;
  onChange: (value: string) => void;

  suffix?: string;

  min?: number;
  step?: string;
};

/* =========================================================
   FALLBACK
   Используются только если BingX API временно недоступен.
   ========================================================= */

const fallbackCrypto: Contract[] = [
  {
    symbol: "BTC-USDT",
    asset: "BTC",
    currency: "USDT",
    pricePrecision: 2,
    quantityPrecision: 4,
    makerFeeRate: 0.0002,
    takerFeeRate: 0.0005,
    tradeMinUSDT: 2,
    maxLongLeverage: 125,
    maxShortLeverage: 125,
    marketType: "crypto",
  },

  {
    symbol: "ETH-USDT",
    asset: "ETH",
    currency: "USDT",
    pricePrecision: 2,
    quantityPrecision: 3,
    makerFeeRate: 0.0002,
    takerFeeRate: 0.0005,
    tradeMinUSDT: 2,
    maxLongLeverage: 100,
    maxShortLeverage: 100,
    marketType: "crypto",
  },

  {
    symbol: "SOL-USDT",
    asset: "SOL",
    currency: "USDT",
    pricePrecision: 3,
    quantityPrecision: 2,
    makerFeeRate: 0.0002,
    takerFeeRate: 0.0005,
    tradeMinUSDT: 2,
    maxLongLeverage: 100,
    maxShortLeverage: 100,
    marketType: "crypto",
  },
];

const fallbackTradFi: Contract[] = [
  {
    symbol: "GOLD(XAU)-USDT",
    asset: "GOLD(XAU)",
    currency: "USDT",
    pricePrecision: 2,
    quantityPrecision: 3,

    makerFeeRate: 0.0002,
    takerFeeRate: 0.0005,

    maxLongLeverage: 100,
    maxShortLeverage: 100,

    marketType: "tradfi",
    tradfiCategory: "metals",

    aliases: ["GOLD", "XAU", "XAUUSD"],
  },

  {
    symbol: "SILVER(XAG)-USDT",
    asset: "SILVER(XAG)",
    currency: "USDT",

    pricePrecision: 3,
    quantityPrecision: 2,

    makerFeeRate: 0.0002,
    takerFeeRate: 0.0005,

    maxLongLeverage: 100,
    maxShortLeverage: 100,

    marketType: "tradfi",
    tradfiCategory: "metals",

    aliases: ["SILVER", "XAG", "XAGUSD"],
  },

  {
    symbol: "Zinc(XZN)-USDT",
    asset: "Zinc(XZN)",
    currency: "USDT",

    pricePrecision: 4,
    quantityPrecision: 2,

    makerFeeRate: 0.0002,
    takerFeeRate: 0.0005,

    maxLongLeverage: 50,
    maxShortLeverage: 50,

    marketType: "tradfi",
    tradfiCategory: "commodities",

    aliases: ["ZINC", "XZN"],
  },

  {
    symbol: "NVDA-USDT",
    asset: "NVDA",
    currency: "USDT",

    pricePrecision: 2,
    quantityPrecision: 3,

    makerFeeRate: 0.0002,
    takerFeeRate: 0.0005,

    maxLongLeverage: 20,
    maxShortLeverage: 20,

    marketType: "tradfi",
    tradfiCategory: "stocks",
  },

  {
    symbol: "AAPL-USDT",
    asset: "AAPL",
    currency: "USDT",

    pricePrecision: 2,
    quantityPrecision: 3,

    makerFeeRate: 0.0002,
    takerFeeRate: 0.0005,

    maxLongLeverage: 20,
    maxShortLeverage: 20,

    marketType: "tradfi",
    tradfiCategory: "stocks",
  },

  {
    symbol: "EURUSD-USDT",
    asset: "EURUSD",
    currency: "USDT",

    pricePrecision: 5,
    quantityPrecision: 2,

    makerFeeRate: 0.0002,
    takerFeeRate: 0.0005,

    maxLongLeverage: 100,
    maxShortLeverage: 100,

    marketType: "tradfi",
    tradfiCategory: "forex",

    aliases: ["EURUSD", "EUR/USD"],
  },

  {
    symbol: "XAUUSD-USDT",
    asset: "XAUUSD",
    currency: "USDT",

    pricePrecision: 2,
    quantityPrecision: 3,

    makerFeeRate: 0.0002,
    takerFeeRate: 0.0005,

    maxLongLeverage: 100,
    maxShortLeverage: 100,

    marketType: "tradfi",
    tradfiCategory: "metals",

    aliases: ["XAUUSD", "XAU/USD"],
  },
];

const categoryNames: Record<TradFiCategory, string> = {
  all: "Все",
  forex: "Forex",
  stocks: "Акции",
  indices: "Индексы",
  metals: "Металлы",
  commodities: "Сырьё",
};

/* =========================================================
   INPUT
   Храним значение строкой.
   Теперь поле можно реально очистить.
   ========================================================= */

function NumericInput({
  value,
  onChange,
  suffix,
  min,
  step = "any",
}: NumberInputProps) {
  return (
    <div className="input-suffix">
      <input
        type="number"
        inputMode="decimal"
        value={value}
        min={min}
        step={step}
        onChange={(event) => onChange(event.target.value)}
      />

      {suffix && <span>{suffix}</span>}
    </div>
  );
}

/* =========================================================
   HELPERS
   ========================================================= */

function toNumber(value: string | number) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (value.trim() === "") {
    return 0;
  }

  const parsed = Number(value.replace(",", "."));

  return Number.isFinite(parsed) ? parsed : 0;
}

function fmt(value: number, digits = 2) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function smartPrecision(
  value: number,
  exchangePrecision?: number
) {
  const absolute = Math.abs(value);

  let derived = 2;

  if (absolute === 0) {
    derived = exchangePrecision ?? 2;
  } else if (absolute >= 100) {
    derived = 2;
  } else if (absolute >= 1) {
    derived = 4;
  } else if (absolute >= 0.1) {
    derived = 5;
  } else if (absolute >= 0.01) {
    derived = 6;
  } else if (absolute >= 0.001) {
    derived = 7;
  } else {
    derived = 8;
  }

  return Math.min(
    Math.max(derived, exchangePrecision ?? 0),
    10
  );
}

function fmtPrice(
  value: number,
  exchangePrecision?: number
) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  const digits = smartPrecision(
    value,
    exchangePrecision
  );

  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  }).format(value);
}

function fmtSmallMoney(
  value: number,
  exchangePrecision?: number
) {
  if (!Number.isFinite(value)) {
    return "—";
  }

  if (Math.abs(value) >= 1) {
    return fmt(value, 2);
  }

  return fmtPrice(
    value,
    exchangePrecision
  );
}

function pct(
  value: number,
  digits = 2
) {
  return `${fmt(value, digits)}%`;
}

function normalizeSearch(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function normalizeSymbol(value: string) {
  return value
    .toUpperCase()
    .trim()
    .replace("/", "-")
    .replace("_", "-")
    .replace("-PERP", "");
}

async function apiGet<T>(
  url: string
): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status}`
    );
  }

  const data = await response.json();

  if (
    data?.code !== undefined &&
    data.code !== 0
  ) {
    throw new Error(
      data.msg ||
        "BingX API error"
    );
  }

  return data;
}

function contractMatches(
  contract: Contract,
  query: string
) {
  const normalizedQuery =
    normalizeSearch(query);

  if (!normalizedQuery) {
    return true;
  }

  const values = [
    contract.symbol,
    contract.asset || "",
    ...(contract.aliases || []),
  ].map(normalizeSearch);

  return values.some(
    (value) =>
      value.includes(
        normalizedQuery
      )
  );
}

/* =========================================================
   SHARE CARD
   ========================================================= */

function makeShareCanvas(data: {
  symbol: string;

  side: Side;
  leverage: number;

  entry: number;
  stop: number;
  takeProfit: number;

  risk: number;
  riskPercent: number;

  positionSize: number;
  margin: number;

  profit: number;
  rr: number;
  fee: number;

  pricePrecision?: number;
}) {
  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width = 1080;
  canvas.height = 1350;

  const ctx =
    canvas.getContext("2d");

  if (!ctx) {
    throw new Error(
      "Canvas unavailable"
    );
  }

  const wine = "#68121e";
  const green = "#173d3a";
  const ink = "#2a1919";
  const muted = "#7c6d69";
  const paper = "#fbf6f2";

  const accent =
    data.side === "LONG"
      ? green
      : wine;

  /* BACKGROUND */

  ctx.fillStyle = paper;

  ctx.fillRect(
    0,
    0,
    canvas.width,
    canvas.height
  );

  /* marble */

  ctx.globalAlpha = 0.08;
  ctx.strokeStyle = wine;
  ctx.lineWidth = 2;

  for (
    let index = 0;
    index < 9;
    index++
  ) {
    ctx.beginPath();

    const y =
      90 + index * 145;

    ctx.moveTo(
      -30,
      y
    );

    ctx.bezierCurveTo(
      250,
      y - 80,
      590,
      y + 70,
      1110,
      y - 20
    );

    ctx.stroke();
  }

  ctx.globalAlpha = 1;

  /* LOGO */

  ctx.fillStyle = ink;

  ctx.font =
    "600 58px Georgia";

  ctx.fillText(
    "DO",
    72,
    105
  );

  ctx.font =
    "600 34px Georgia";

  ctx.fillText(
    "TRADE CALCULATOR",
    175,
    88
  );

  ctx.fillStyle = muted;

  ctx.font =
    "400 22px Arial";

  ctx.fillText(
    "Расчёт сделки до входа",
    177,
    120
  );

  ctx.strokeStyle = "#dfd0ca";
  ctx.lineWidth = 2;

  ctx.beginPath();

  ctx.moveTo(
    70,
    165
  );

  ctx.lineTo(
    1010,
    165
  );

  ctx.stroke();

  /* HEAD */

  ctx.fillStyle = ink;

  ctx.font =
    "600 26px Arial";

  ctx.fillText(
    "РАСЧЁТ СДЕЛКИ",
    72,
    230
  );

  ctx.font =
    "700 48px Arial";

  ctx.fillText(
    data.symbol,
    72,
    310
  );

  ctx.fillStyle = accent;

  ctx.font =
    "700 34px Arial";

  ctx.fillText(
    `${data.side}  •  ${data.leverage}x`,
    72,
    365
  );

  /* LEVEL CARDS */

  const cards = [
    [
      "ENTRY",
      fmtPrice(
        data.entry,
        data.pricePrecision
      ),
    ],

    [
      "STOP LOSS",
      fmtPrice(
        data.stop,
        data.pricePrecision
      ),
    ],

    [
      "TAKE PROFIT",
      fmtPrice(
        data.takeProfit,
        data.pricePrecision
      ),
    ],
  ];

  let y = 455;

  for (
    const [label, value]
    of cards
  ) {
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#e4d5d0";
    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.roundRect(
      70,
      y - 55,
      940,
      100,
      18
    );

    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = muted;

    ctx.font =
      "600 20px Arial";

    ctx.fillText(
      label,
      100,
      y - 15
    );

    ctx.fillStyle = ink;

    ctx.font =
      "700 34px Arial";

    ctx.textAlign = "right";

    ctx.fillText(
      value,
      965,
      y + 7
    );

    ctx.textAlign = "left";

    y += 125;
  }

  /* PROFIT */

  ctx.fillStyle = accent;

  ctx.beginPath();

  ctx.roundRect(
    70,
    810,
    940,
    185,
    26
  );

  ctx.fill();

  ctx.fillStyle = "#ffffff";

  ctx.font =
    "500 22px Arial";

  ctx.fillText(
    "ПОТЕНЦИАЛЬНАЯ ПРИБЫЛЬ ПОСЛЕ КОМИССИИ",
    105,
    860
  );

  ctx.font =
    "700 62px Arial";

  ctx.fillText(
    `+${fmt(
      data.profit
    )} USDT`,
    105,
    935
  );

  /* DETAILS */

  ctx.fillStyle = ink;

  ctx.font =
    "700 25px Arial";

  ctx.fillText(
    `R:R   1 : ${fmt(
      data.rr,
      2
    )}`,
    75,
    1065
  );

  ctx.fillText(
    `Риск   ${fmt(
      data.risk
    )} USDT (${fmt(
      data.riskPercent,
      2
    )}%)`,
    75,
    1110
  );

  ctx.font =
    "500 22px Arial";

  ctx.fillStyle = muted;

  ctx.fillText(
    `Размер позиции: ${fmt(
      data.positionSize
    )} USDT`,
    75,
    1170
  );

  ctx.fillText(
    `Необходимая маржа: ${fmt(
      data.margin
    )} USDT`,
    75,
    1210
  );

  ctx.fillText(
    `Ориентировочная комиссия: ${fmtSmallMoney(
      data.fee
    )} USDT`,
    75,
    1250
  );

  ctx.fillStyle = wine;

  ctx.font =
    "600 22px Georgia";

  ctx.fillText(
    "DASHA OZDEN • TRADE CALCULATOR",
    75,
    1310
  );

  return canvas;
}

/* =========================================================
   APP
   ========================================================= */

export default function App() {
  const [market, setMarket] =
    useState<Market>("crypto");

  const [
    tradfiCategory,
    setTradfiCategory,
  ] =
    useState<TradFiCategory>(
      "all"
    );

  const [
    contracts,
    setContracts,
  ] =
    useState<Contract[]>([]);

  const [query, setQuery] =
    useState("BTC");

  const [
    selected,
    setSelected,
  ] =
    useState<Contract>(
      fallbackCrypto[0]
    );

  const [
    suggestionsOpen,
    setSuggestionsOpen,
  ] =
    useState(false);

  /* STRING STATES */

  const [price, setPrice] =
    useState("112438.20");

  const [balance, setBalance] =
    useState("10000");

  const [
    riskPercent,
    setRiskPercent,
  ] =
    useState("1");

  const [entry, setEntry] =
    useState("110000");

  const [stop, setStop] =
    useState("107800");

  const [
    takeProfit,
    setTakeProfit,
  ] =
    useState("116600");

  const [live, setLive] =
    useState(true);

  const [side, setSide] =
    useState<Side>("LONG");

  const [
    leverage,
    setLeverage,
  ] =
    useState(10);

  const [
    feeSide,
    setFeeSide,
  ] =
    useState<FeeSide>("Taker");

  const [
    manualPrice,
    setManualPrice,
  ] =
    useState(false);

  const [saved, setSaved] =
    useState(false);

  const [
    apiMessage,
    setApiMessage,
  ] =
    useState("");

  const [
    instructionsOpen,
    setInstructionsOpen,
  ] =
    useState(false);

  const [
    shareOpen,
    setShareOpen,
  ] =
    useState(false);

  const sharePreviewRef =
    useRef<HTMLCanvasElement | null>(
      null
    );

  /* NUMBERS */

  const balanceN =
    toNumber(balance);

  const riskPercentN =
    toNumber(riskPercent);

  const entryN =
    toNumber(entry);

  const stopN =
    toNumber(stop);

  const takeProfitN =
    toNumber(takeProfit);

  const priceN =
    toNumber(price);

  /* RISK */

  const riskAmount =
    balanceN *
    riskPercentN /
    100;

  const stopDistance =
    Math.abs(
      entryN -
      stopN
    );

  const stopDistancePct =
    entryN > 0
      ? stopDistance /
        entryN
      : 0;

  const tpDistance =
    Math.abs(
      takeProfitN -
      entryN
    );

  const tpDistancePct =
    entryN > 0
      ? tpDistance /
        entryN
      : 0;

  /* FEE */

  const feeRate =
    feeSide === "Maker"
      ? selected.makerFeeRate ??
        0.0002
      : selected.takerFeeRate ??
        0.0005;

  /*
   * В риск уже включаем
   * ориентировочную комиссию
   * вход + выход по стопу.
   */

  const feePerUnitToStop =
    entryN * feeRate +
    stopN * feeRate;

  const riskPerUnit =
    stopDistance +
    feePerUnitToStop;

  const quantity =
    riskPerUnit > 0
      ? riskAmount /
        riskPerUnit
      : 0;

  const positionSize =
    quantity * entryN;

  const margin =
    leverage > 0
      ? positionSize /
        leverage
      : 0;

  const entryFee =
    positionSize *
    feeRate;

  const stopExitFee =
    quantity *
    stopN *
    feeRate;

  const tpExitFee =
    quantity *
    takeProfitN *
    feeRate;

  const estimatedLoss =
    quantity *
      stopDistance +
    entryFee +
    stopExitFee;

  const grossProfit =
    quantity *
    tpDistance;

  const netProfit =
    Math.max(
      0,
      grossProfit -
        entryFee -
        tpExitFee
    );

  const rr =
    estimatedLoss > 0
      ? netProfit /
        estimatedLoss
      : 0;

  const roundTripFeeToTp =
    entryFee +
    tpExitFee;

  /* CONTRACT LIST */

  const filteredContracts =
    useMemo(() => {
      const source =
        contracts.length
          ? contracts
          : market ===
              "crypto"
            ? fallbackCrypto
            : fallbackTradFi;

      return source.filter(
        (contract) => {
          if (
            contract.marketType &&
            contract.marketType !==
              market
          ) {
            return false;
          }

          if (
            market ===
              "tradfi" &&
            tradfiCategory !==
              "all"
          ) {
            return (
              contract.tradfiCategory ===
              tradfiCategory
            );
          }

          return true;
        }
      );
    }, [
      contracts,
      market,
      tradfiCategory,
    ]);

  const suggestions =
    useMemo(() => {
      return filteredContracts
        .filter((contract) =>
          contractMatches(
            contract,
            query
          )
        )
        .slice(0, 12);
    }, [
      filteredContracts,
      query,
    ]);

  /* API */

  async function loadContracts() {
    setApiMessage("");

    try {
      const result =
        await apiGet<{
          data: Contract[];
        }>(
          "/api/bingx?action=contracts"
        );

      const list =
        Array.isArray(
          result.data
        )
          ? result.data
          : [];

      setContracts(list);

      setApiMessage(
        "Данные BingX обновлены"
      );
    } catch {
      setApiMessage(
        "BingX пока недоступен — можно продолжить с ручным вводом."
      );
    }
  }

  async function loadTicker(
    contract: Contract
  ) {
    setApiMessage("");

    try {
      const result =
        await apiGet<{
          data: {
            lastPrice?: string;
            markPrice?: string;
            price?: string;
          };
        }>(
          "/api/bingx?action=ticker&symbol=" +
            encodeURIComponent(
              normalizeSymbol(
                contract.symbol
              )
            )
        );

      const next =
        toNumber(
          result.data
            ?.lastPrice ||
            result.data
              ?.markPrice ||
            result.data?.price ||
            "0"
        );

      if (next > 0) {
        setPrice(
          String(next)
        );

        setLive(true);

        if (!manualPrice) {
          setEntry(
            String(next)
          );

          const stopPct =
            0.02;

          const tpPct =
            0.06;

          setStop(
            String(
              next *
                (side ===
                "LONG"
                  ? 1 -
                    stopPct
                  : 1 +
                    stopPct)
            )
          );

          setTakeProfit(
            String(
              next *
                (side ===
                "LONG"
                  ? 1 +
                    tpPct
                  : 1 -
                    tpPct)
            )
          );
        }

        setApiMessage(
          "LIVE • цена BingX"
        );
      }
    } catch {
      setLive(false);

      setApiMessage(
        "Не удалось получить цену BingX. Цена и параметры сделки доступны для ручного ввода."
      );
    }
  }

  useEffect(() => {
    void loadContracts();
  }, []);

  useEffect(() => {
    if (
      market === "crypto"
    ) {
      setSelected(
        fallbackCrypto[0]
      );

      setQuery("BTC");
    } else {
      setSelected(
        fallbackTradFi[0]
      );

      setQuery("GOLD");
    }

    setSuggestionsOpen(
      false
    );
  }, [market]);

  /* MAX LEVERAGE */

  const maxLeverage =
    side === "LONG"
      ? selected.maxLongLeverage ??
        125
      : selected.maxShortLeverage ??
        125;

  useEffect(() => {
    if (
      leverage >
      maxLeverage
    ) {
      setLeverage(
        maxLeverage
      );
    }
  }, [
    selected,
    side,
    leverage,
    maxLeverage,
  ]);

  function selectContract(
    contract: Contract
  ) {
    setSelected(
      contract
    );

    setQuery(
      (
        contract.asset ||
        contract.symbol.replace(
          /-USDT$/i,
          ""
        )
      ).toUpperCase()
    );

    setSuggestionsOpen(
      false
    );

    setManualPrice(
      false
    );

    void loadTicker(
      contract
    );
  }

  function changeSide(
    next: Side
  ) {
    setSide(next);

    if (entryN <= 0) {
      return;
    }

    const stopPct =
      0.02;

    const tpPct =
      0.06;

    setStop(
      String(
        entryN *
          (next ===
          "LONG"
            ? 1 -
              stopPct
            : 1 +
              stopPct)
      )
    );

    setTakeProfit(
      String(
        entryN *
          (next ===
          "LONG"
            ? 1 +
              tpPct
            : 1 -
              tpPct)
      )
    );
  }

  function reset() {
    setBalance(
      "10000"
    );

    setRiskPercent(
      "1"
    );

    setEntry(price);

    if (priceN > 0) {
      setStop(
        String(
          priceN *
            (side ===
            "LONG"
              ? 0.98
              : 1.02)
        )
      );

      setTakeProfit(
        String(
          priceN *
            (side ===
            "LONG"
              ? 1.06
              : 0.94)
        )
      );
    } else {
      setStop("");
      setTakeProfit("");
    }

    setLeverage(
      Math.min(
        10,
        maxLeverage
      )
    );
  }

  function saveDeal() {
    setSaved(true);

    window.setTimeout(
      () =>
        setSaved(false),
      1600
    );
  }

  const pricePrecision =
    selected.pricePrecision ??
    2;

  const quantityPrecision =
    selected.quantityPrecision ??
    4;

  const displaySymbol =
    selected.asset ||
    selected.symbol.replace(
      /-USDT$/i,
      ""
    );

  const positionLabel =
    market === "crypto"
      ? "Бессрочные фьючерсы"
      : "TradFi • бессрочные фьючерсы / CFD";

  /* SHARE */

  function buildShareCanvas() {
    return makeShareCanvas({
      symbol:
        displaySymbol,

      side,
      leverage,

      entry: entryN,
      stop: stopN,
      takeProfit:
        takeProfitN,

      risk:
        estimatedLoss,

      riskPercent:
        riskPercentN,

      positionSize,
      margin,

      profit:
        netProfit,

      rr,

      fee:
        roundTripFeeToTp,

      pricePrecision,
    });
  }

  function openShare() {
    setShareOpen(true);

    window.setTimeout(
      () => {
        const preview =
          sharePreviewRef.current;

        if (!preview) {
          return;
        }

        const source =
          buildShareCanvas();

        preview.width =
          source.width;

        preview.height =
          source.height;

        preview
          .getContext("2d")
          ?.drawImage(
            source,
            0,
            0
          );
      },
      50
    );
  }

  function downloadShareImage() {
    const canvas =
      buildShareCanvas();

    const link =
      document.createElement(
        "a"
      );

    link.download =
      `trade-calculator-${displaySymbol}-${side}.png`;

    link.href =
      canvas.toDataURL(
        "image/png"
      );

    link.click();
  }

  async function nativeShare() {
    const canvas =
      buildShareCanvas();

    const blob =
      await new Promise<Blob | null>(
        (resolve) =>
          canvas.toBlob(
            resolve,
            "image/png"
          )
      );

    if (!blob) {
      return;
    }

    const file =
      new File(
        [blob],
        `trade-calculator-${displaySymbol}.png`,
        {
          type: "image/png",
        }
      );

    if (
      navigator.share &&
      navigator.canShare?.({
        files: [file],
      })
    ) {
      await navigator.share({
        title:
          `Расчёт ${displaySymbol}`,

        text:
          `Trade Calculator: ${displaySymbol} ${side}, R:R 1:${fmt(
            rr,
            2
          )}`,

        files: [file],
      });
    } else {
      downloadShareImage();
    }
  }

  /* ===================================================== */

  return (
    <div className="site">
      <header className="header container">
        <div className="brand">
          <div className="brand-mark">
            <span>D</span>
            <i>O</i>
          </div>

          <div>
            <div className="brand-name">
              TRADE CALCULATOR
            </div>

            <div className="brand-subtitle">
              Рассчитай сделку до входа
            </div>
          </div>
        </div>

        <nav className="top-nav">
          <a href="#calculator">
            Калькулятор
          </a>

          <a href="#tools">
            Инструменты
          </a>

          <a href="#about">
            О проекте
          </a>

          <button
            className="saved-button"
            onClick={saveDeal}
          >
            {saved
              ? "Сделка сохранена"
              : "Сохраненные сделки"}

            <span>♡</span>
          </button>
        </nav>
      </header>

      <main className="container">
        {/* MARKET */}

        <section className="market-tabs market-tabs-v2">
          <button
            className={
              market === "crypto"
                ? "active crypto-tab"
                : "crypto-tab"
            }
            onClick={() =>
              setMarket(
                "crypto"
              )
            }
          >
            <span className="tab-icon">
              ⌁
            </span>

            <span>
              <b>CRYPTO</b>

              <small>
                Бессрочные фьючерсы
              </small>
            </span>
          </button>

          <button
            className={
              market === "tradfi"
                ? "active tradfi-tab"
                : "tradfi-tab"
            }
            onClick={() =>
              setMarket(
                "tradfi"
              )
            }
          >
            <span className="tab-icon">
              ◌
            </span>

            <span>
              <b>TRADFI</b>

              <small>
                Forex • акции • индексы • металлы • сырьё
              </small>
            </span>
          </button>
        </section>

        {market ===
          "tradfi" && (
          <section className="tradfi-categories">
            {(
              Object.keys(
                categoryNames
              ) as TradFiCategory[]
            ).map(
              (category) => (
                <button
                  key={
                    category
                  }
                  className={
                    tradfiCategory ===
                    category
                      ? "active"
                      : ""
                  }
                  onClick={() =>
                    setTradfiCategory(
                      category
                    )
                  }
                >
                  {
                    categoryNames[
                      category
                    ]
                  }
                </button>
              )
            )}
          </section>
        )}

        {/* CALCULATOR */}

        <section
          id="calculator"
          className="calculator-shell"
        >
          {/* LEFT */}

          <div className="left-panel">
            {/* ACCOUNT */}

            <div className="form-section">
              <div className="section-title">
                <b>01.</b>{" "}
                СЧЕТ
              </div>

              <div className="field-row">
                <label>
                  Валюта счета
                </label>

                <div className="select-like">
                  USDT

                  <span>⌄</span>
                </div>
              </div>

              <div className="field-row">
                <label>
                  Депозит
                </label>

                <NumericInput
                  value={
                    balance
                  }
                  onChange={
                    setBalance
                  }
                  suffix="USDT"
                  min={0}
                />
              </div>

              <div className="field-row">
                <label>
                  Риск на сделку
                </label>

                <NumericInput
                  value={
                    riskPercent
                  }
                  onChange={
                    setRiskPercent
                  }
                  suffix="%"
                  min={0}
                  step="0.1"
                />
              </div>

              <div className="risk-card">
                <span>
                  Риск в USDT
                </span>

                <strong>
                  {balance ===
                    "" ||
                  riskPercent ===
                    ""
                    ? "—"
                    : fmt(
                        riskAmount
                      )}

                  <small>
                    {" "}
                    USDT
                  </small>
                </strong>
              </div>
            </div>

            {/* TRADE */}

            <div className="form-section trade-section">
              <div className="section-title">
                <b>02.</b>{" "}
                ТОРГОВЛЯ
              </div>

              <div className="field-label">
                Тип сделки
              </div>

              <div className="side-buttons">
                <button
                  className={
                    side ===
                    "LONG"
                      ? "chosen long"
                      : ""
                  }
                  onClick={() =>
                    changeSide(
                      "LONG"
                    )
                  }
                >
                  LONG ↗
                </button>

                <button
                  className={
                    side ===
                    "SHORT"
                      ? "chosen short"
                      : ""
                  }
                  onClick={() =>
                    changeSide(
                      "SHORT"
                    )
                  }
                >
                  SHORT ↓
                </button>
              </div>

              <div className="field-label ticker-label">
                {positionLabel}
              </div>

              {/* TICKER */}

              <div className="ticker-wrap">
                <input
                  value={
                    query
                  }
                  onChange={(
                    event
                  ) => {
                    setQuery(
                      event.target.value.toUpperCase()
                    );

                    setSuggestionsOpen(
                      true
                    );
                  }}
                  onFocus={() =>
                    setSuggestionsOpen(
                      true
                    )
                  }
                  placeholder={
                    market ===
                    "crypto"
                      ? "BTC"
                      : "GOLD / NVDA / EURUSD"
                  }
                />

                <span className="exchange">
                  BingX{" "}
                  <b>⌄</b>
                </span>

                {suggestionsOpen && (
                  <div className="suggestions">
                    {suggestions.length >
                    0 ? (
                      suggestions.map(
                        (
                          contract
                        ) => (
                          <button
                            key={
                              contract.symbol
                            }
                            onMouseDown={(
                              event
                            ) =>
                              event.preventDefault()
                            }
                            onClick={() =>
                              selectContract(
                                contract
                              )
                            }
                          >
                            <span>
                              <strong>
                                {contract.asset ||
                                  contract.symbol.replace(
                                    /-USDT$/i,
                                    ""
                                  )}
                              </strong>

                              <small>
                                {contract.tradfiCategory
                                  ? categoryNames[
                                      contract
                                        .tradfiCategory
                                    ]
                                  : "Crypto"}
                              </small>
                            </span>

                            <span>
                              {
                                contract.symbol
                              }
                            </span>
                          </button>
                        )
                      )
                    ) : (
                      <div className="no-suggestions">
                        Совпадений не найдено
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* LIVE PRICE */}

              <div className="live-price">
                <div>
                  <span>
                    Текущая цена

                    <em>
                      {live
                        ? "LIVE"
                        : "MANUAL"}
                    </em>
                  </span>

                  <strong>
                    {price === ""
                      ? "—"
                      : fmtPrice(
                          priceN,
                          pricePrecision
                        )}

                    <small>
                      {" "}
                      USDT
                    </small>
                  </strong>
                </div>

                <div className="price-actions">
                  <button
                    title="Обновить"
                    onClick={() =>
                      void loadTicker(
                        selected
                      )
                    }
                  >
                    ↻
                  </button>

                  <button
                    title="Ручной ввод"
                    onClick={() =>
                      setManualPrice(
                        true
                      )
                    }
                  >
                    ✎
                  </button>
                </div>
              </div>

              {/* LEVELS */}

              <div className="field-row">
                <label>
                  Цена входа
                </label>

                <NumericInput
                  value={
                    entry
                  }
                  onChange={(
                    value
                  ) => {
                    setEntry(
                      value
                    );

                    setManualPrice(
                      true
                    );
                  }}
                  suffix="USDT"
                  min={0}
                />
              </div>

              <div className="field-row">
                <label>
                  Stop Loss
                </label>

                <NumericInput
                  value={
                    stop
                  }
                  onChange={
                    setStop
                  }
                  suffix="USDT"
                  min={0}
                />
              </div>

              <div className="field-row">
                <label>
                  Take Profit
                </label>

                <NumericInput
                  value={
                    takeProfit
                  }
                  onChange={
                    setTakeProfit
                  }
                  suffix="USDT"
                  min={0}
                />
              </div>

              {/* LEVERAGE */}

              <div className="leverage-block">
                <div className="leverage-head">
                  <label>
                    Плечо
                  </label>

                  <strong>
                    {leverage}x
                  </strong>
                </div>

                <input
                  className="leverage-range"
                  type="range"
                  min="1"
                  max={Math.max(
                    1,
                    maxLeverage
                  )}
                  step="1"
                  value={Math.min(
                    leverage,
                    maxLeverage
                  )}
                  onChange={(
                    event
                  ) =>
                    setLeverage(
                      Number(
                        event
                          .target
                          .value
                      )
                    )
                  }
                />

                <div className="leverage-scale">
                  <span>
                    1x
                  </span>

                  <span>
                    {
                      maxLeverage
                    }
                    x
                  </span>
                </div>
              </div>

              <button className="advanced">
                › &nbsp;
                Дополнительные параметры
              </button>

              <div className="calculate-row">
                <button
                  className="calculate"
                  onClick={() =>
                    window.scrollTo(
                      {
                        top: 300,
                        behavior:
                          "smooth",
                      }
                    )
                  }
                >
                  РАССЧИТАТЬ
                </button>

                <button
                  className="reset"
                  onClick={
                    reset
                  }
                >
                  ↻
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT */}

          <div className="right-panel">
            <div className="results-head">
              <div className="section-title">
                РЕЗУЛЬТАТЫ
              </div>

              <div className="result-actions">
                <button
                  className="share-small"
                  onClick={
                    openShare
                  }
                >
                  Поделиться ↗
                </button>

                <button
                  className="save-small"
                  onClick={
                    saveDeal
                  }
                >
                  {saved
                    ? "Сохранено"
                    : "Сохранить сделку"}

                  {" "}♡
                </button>
              </div>
            </div>

            {/* BIG RESULTS */}

            <div className="big-results">
              <div>
                <span>
                  РАЗМЕР ПОЗИЦИИ
                </span>

                <strong>
                  {fmt(
                    positionSize
                  )}
                </strong>

                <small>
                  USDT
                </small>
              </div>

              <div>
                <span>
                  РИСК
                </span>

                <strong>
                  {fmt(
                    estimatedLoss
                  )}
                </strong>

                <small>
                  USDT
                  <br />

                  {pct(
                    riskPercentN
                  )}{" "}
                  от депозита
                </small>
              </div>

              <div>
                <span>
                  ПОТЕНЦИАЛЬНАЯ ПРИБЫЛЬ
                </span>

                <strong>
                  {fmt(
                    netProfit
                  )}
                </strong>

                <small>
                  USDT
                  <br />

                  {pct(
                    (netProfit /
                      Math.max(
                        balanceN,
                        1
                      )) *
                      100
                  )}{" "}
                  от депозита
                </small>
              </div>
            </div>

            {/* MINI RESULTS */}

            <div className="mini-results">
              <div>
                <span>
                  R:R
                </span>

                <strong>
                  1 :{" "}
                  {fmt(
                    rr,
                    2
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Маржа
                </span>

                <strong>
                  {fmt(
                    margin
                  )}

                  <small>
                    {" "}
                    USDT
                  </small>
                </strong>
              </div>

              <div>
                <span>
                  Комиссия (ориент.)
                </span>

                <strong>
                  {fmtSmallMoney(
                    roundTripFeeToTp,
                    pricePrecision
                  )}

                  <small>
                    {" "}
                    USDT
                  </small>
                </strong>
              </div>

              <div>
                <span>
                  Стоп дистанция
                </span>

                <strong>
                  {pct(
                    stopDistancePct *
                      100
                  )}
                </strong>
              </div>
            </div>

            {/* MAP */}

            <div className="chart-card">
              <div className="price-chart">
                <div
                  className="tp-line"
                  style={{
                    top: "18%",
                  }}
                >
                  <span>
                    Take Profit
                    <br />

                    <b>
                      {fmtPrice(
                        takeProfitN,
                        pricePrecision
                      )}
                    </b>
                  </span>

                  <i />
                </div>

                <div
                  className="entry-line"
                  style={{
                    top: "50%",
                  }}
                >
                  <span>
                    Entry
                    <br />

                    <b>
                      {fmtPrice(
                        entryN,
                        pricePrecision
                      )}
                    </b>
                  </span>

                  <i />
                </div>

                <div
                  className="sl-line"
                  style={{
                    top: "82%",
                  }}
                >
                  <span>
                    Stop Loss
                    <br />

                    <b>
                      {fmtPrice(
                        stopN,
                        pricePrecision
                      )}
                    </b>
                  </span>

                  <i />
                </div>

                <div className="vertical-price" />

                <div
                  className="price-marker tp-marker"
                  style={{
                    top: "18%",
                  }}
                >
                  +
                  {fmt(
                    netProfit
                  )}{" "}
                  USDT
                  <br />

                  <b>
                    +
                    {pct(
                      (netProfit /
                        Math.max(
                          positionSize,
                          1
                        )) *
                        100
                    )}
                  </b>
                </div>

                <div
                  className="price-marker entry-marker"
                  style={{
                    top: "50%",
                  }}
                >
                  ENTRY
                  <br />

                  <b>
                    {fmtPrice(
                      entryN,
                      pricePrecision
                    )}{" "}
                    USDT
                  </b>
                </div>

                <div
                  className="price-marker sl-marker"
                  style={{
                    top: "82%",
                  }}
                >
                  -
                  {fmt(
                    estimatedLoss
                  )}{" "}
                  USDT
                  <br />

                  <b>
                    -
                    {pct(
                      riskPercentN
                    )}
                  </b>
                </div>
              </div>

              <div className="chart-footer">
                <span>
                  Расстояние до TP:{" "}
                  {fmtPrice(
                    tpDistance,
                    pricePrecision
                  )}{" "}
                  (
                  {pct(
                    tpDistancePct *
                      100
                  )}
                  )
                </span>

                <span>
                  Расстояние до SL:{" "}
                  {fmtPrice(
                    stopDistance,
                    pricePrecision
                  )}{" "}
                  (
                  {pct(
                    stopDistancePct *
                      100
                  )}
                  )
                </span>
              </div>
            </div>

            {/* DETAILS */}

            <div className="details-card">
              <h4>
                ДЕТАЛИ РАСЧЕТА
              </h4>

              <div className="details-grid">
                <div>
                  <span>
                    Размер позиции
                  </span>

                  <b>
                    {fmt(
                      positionSize
                    )}{" "}
                    USDT
                  </b>
                </div>

                <div>
                  <span>
                    Риск на 1{" "}
                    {displaySymbol}
                  </span>

                  <b>
                    {fmtPrice(
                      riskPerUnit,
                      pricePrecision
                    )}{" "}
                    USDT
                  </b>
                </div>

                <div>
                  <span>
                    Количество (
                    {displaySymbol})
                  </span>

                  <b>
                    {fmtPrice(
                      quantity,
                      quantityPrecision
                    )}
                  </b>
                </div>

                <div>
                  <span>
                    Плечо
                  </span>

                  <b>
                    {leverage}x
                  </b>
                </div>

                <div>
                  <span>
                    Стоимость позиции
                  </span>

                  <b>
                    {fmt(
                      positionSize
                    )}{" "}
                    USDT
                  </b>
                </div>

                <div>
                  <span>
                    Комиссия (
                    {feeSide})
                  </span>

                  <b>
                    {pct(
                      feeRate *
                        100,
                      4
                    )}
                  </b>
                </div>

                <div>
                  <span>
                    Маржа (
                    {leverage}x)
                  </span>

                  <b>
                    {fmt(
                      margin
                    )}{" "}
                    USDT
                  </b>
                </div>

                <div>
                  <span>
                    Тип комиссии
                  </span>

                  <b className="fee-switch">
                    <button
                      className={
                        feeSide ===
                        "Taker"
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setFeeSide(
                          "Taker"
                        )
                      }
                    >
                      Taker
                    </button>

                    <button
                      className={
                        feeSide ===
                        "Maker"
                          ? "active"
                          : ""
                      }
                      onClick={() =>
                        setFeeSide(
                          "Maker"
                        )
                      }
                    >
                      Maker
                    </button>
                  </b>
                </div>
              </div>
            </div>

            <div className="status-card">
              <div className="status-icon">
                i
              </div>

              <div>
                <strong>
                  {apiMessage ||
                    "Данные о цене и комиссии получены из BingX"}
                </strong>

                <span>
                  Комиссия зависит от выбранного инструмента и типа ордера.
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* HOW */}

        <section className="how-section">
          <h2>
            КАК ЭТО РАБОТАЕТ?
          </h2>

          <div className="steps">
            {[
              [
                "01",
                "УКАЖИТЕ ПАРАМЕТРЫ",
                "Введите депозит, риск и параметры сделки",
                "☑",
              ],

              [
                "02",
                "МЫ РАССЧИТАЕМ",
                "Калькулятор автоматически рассчитает позицию и риск",
                "◉",
              ],

              [
                "03",
                "АНАЛИЗИРУЙТЕ",
                "Оцените соотношение риска к прибыли и параметры",
                "⌁",
              ],

              [
                "04",
                "ПРИНИМАЙТЕ РЕШЕНИЕ",
                "Используйте расчет для уверенного входа в сделку",
                "♧",
              ],
            ].map(
              ([
                num,
                title,
                text,
                icon,
              ]) => (
                <div
                  className="step"
                  key={num}
                >
                  <div className="step-icon">
                    {icon}
                  </div>

                  <div>
                    <b>
                      {num}.{" "}
                      {title}
                    </b>

                    <p>
                      {text}
                    </p>
                  </div>
                </div>
              )
            )}
          </div>
        </section>

        {/* CTA */}

        <section
          className="cta-section"
          id="tools"
        >
          <div>
            <h2>
              СОХРАНЯЙТЕ И АНАЛИЗИРУЙТЕ СВОИ СДЕЛКИ
            </h2>

            <p>
              Создайте учетную запись, чтобы сохранять сделки,
              <br />

              отслеживать статистику и анализировать результаты.
            </p>

            <button
              onClick={
                saveDeal
              }
            >
              Создать аккаунт
            </button>
          </div>

          <div className="dashboard-preview">
            <div className="fake-dashboard">
              <div className="fake-sidebar" />
              <div className="fake-chart" />
              <div className="fake-list" />
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}

      <footer id="about">
        <div className="footer-inner container">
          <div className="footer-brand">
            <div className="brand-mark large">
              <span>D</span>
              <i>O</i>
            </div>

            <small>
              OZDEN
            </small>
          </div>

          <div>
            <h4>
              О ПРОЕКТЕ
            </h4>

            <p>
              Профессиональные инструменты
              <br />

              для трейдеров и инвесторов.
              <br />

              Принимайте взвешенные решения
              <br />

              и управляйте рисками.
            </p>
          </div>

          <div>
            <h4>
              ИНСТРУМЕНТЫ
            </h4>

            <p>
              Калькулятор позиции
              <br />

              Калькулятор риска
              <br />

              Калькулятор прибыли
              <br />

              Калькулятор усреднения
              <br />

              Калькулятор ликвидации
            </p>
          </div>

          <div>
            <h4>
              ПОДДЕРЖКА
            </h4>

            <p>
              FAQ
              <br />

              <button
                className="footer-link"
                onClick={() =>
                  setInstructionsOpen(
                    true
                  )
                }
              >
                Инструкции
              </button>

              <br />

              Обратная связь
              <br />

              Политика конфиденциальности
              <br />

              Условия использования
            </p>
          </div>

          <div>
            <h4>
              СЛЕДИТЕ ЗА НОВОСТЯМИ
            </h4>

            <div className="socials">
              <a
                href="https://t.me/dasha_ozden"
                target="_blank"
                rel="noreferrer"
                aria-label="Telegram"
              >
                ➤
              </a>

              <a
                href="https://youtu.be/WXImOBv-674"
                target="_blank"
                rel="noreferrer"
                aria-label="YouTube"
              >
                ▶
              </a>

              <a
                href="https://instagram.com/dashaozd"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
              >
                ◎
              </a>
            </div>

            <p className="copyright">
              © 2026 Trade Calculator. Все права защищены.
            </p>
          </div>
        </div>
      </footer>

      {/* INSTRUCTIONS */}

      {instructionsOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={() =>
            setInstructionsOpen(
              false
            )
          }
        >
          <div
            className="instruction-modal"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <button
              className="modal-close"
              onClick={() =>
                setInstructionsOpen(
                  false
                )
              }
            >
              ×
            </button>

            <div className="modal-kicker">
              TRADE CALCULATOR
            </div>

            <h2>
              Инструкция и словарь
            </h2>

            <p className="modal-lead">
              Короткая памятка, чтобы понимать каждую цифру в расчёте и использовать калькулятор одинаково для Crypto и TradFi.
            </p>

            <h3>
              Как пользоваться
            </h3>

            <div className="instruction-steps">
              <div>
                <b>01</b>

                <span>
                  <strong>
                    Укажите депозит и риск.
                  </strong>{" "}

                  Например, депозит 1 000 USDT и риск 1,5% → риск в USDT равен 15 USDT.
                </span>
              </div>

              <div>
                <b>02</b>

                <span>
                  <strong>
                    Выберите инструмент и направление.
                  </strong>{" "}

                  LONG — расчёт сделки в сторону роста цены, SHORT — в сторону снижения.
                </span>
              </div>

              <div>
                <b>03</b>

                <span>
                  <strong>
                    Укажите Entry, Stop Loss и Take Profit.
                  </strong>{" "}

                  Чем ближе Stop Loss к Entry, тем больше допустимый размер позиции при неизменном риске.
                </span>
              </div>

              <div>
                <b>04</b>

                <span>
                  <strong>
                    Выберите плечо.
                  </strong>{" "}

                  Плечо изменяет необходимую маржу, но не должно увеличивать заранее заданный риск сделки.
                </span>
              </div>

              <div>
                <b>05</b>

                <span>
                  <strong>
                    Изучите результат.
                  </strong>{" "}

                  Проверьте размер позиции, R:R, маржу, комиссию и потенциальную прибыль до входа.
                </span>
              </div>
            </div>

            <h3>
              Словарь
            </h3>

            <div className="dictionary">
              <article>
                <h4>
                  Риск на сделку
                </h4>

                <p>
                  Процент депозита, который трейдер допускает потерять при срабатывании Stop Loss. Пример: 1 000 USDT × 1,5% = 15 USDT.
                </p>
              </article>

              <article>
                <h4>
                  Риск в USDT
                </h4>

                <p>
                  Тот же допустимый риск, но уже выраженный в деньгах. Именно эта сумма используется при расчёте размера позиции.
                </p>
              </article>

              <article>
                <h4>
                  Размер позиции
                </h4>

                <p>
                  Полная стоимость открываемой позиции. Она зависит от риска и расстояния между Entry и Stop Loss.
                </p>
              </article>

              <article>
                <h4>
                  Необходимая маржа
                </h4>

                <p>
                  Собственные средства, необходимые для удержания позиции. Пример: позиция 5 000 USDT при плече 10x требует примерно 500 USDT маржи.
                </p>
              </article>

              <article>
                <h4>
                  Ориентировочная комиссия
                </h4>

                <p>
                  Расчёт расходов на открытие и закрытие позиции по Maker/Taker ставке выбранного инструмента BingX.
                </p>
              </article>

              <article>
                <h4>
                  Потенциальная прибыль после комиссии
                </h4>

                <p>
                  Расчётная прибыль при достижении Take Profit после вычета ориентировочной комиссии входа и выхода.
                </p>
              </article>

              <article>
                <h4>
                  R:R
                </h4>

                <p>
                  Соотношение риска к потенциальной прибыли. Например, 1:3 означает примерно три USDT потенциальной прибыли на один USDT риска.
                </p>
              </article>

              <article>
                <h4>
                  Стоп дистанция
                </h4>

                <p>
                  Расстояние от Entry до Stop Loss в цене и процентах. Для дешёвых активов калькулятор автоматически показывает больше знаков после запятой.
                </p>
              </article>

              <article>
                <h4>
                  Maker / Taker
                </h4>

                <p>
                  Maker обычно добавляет ликвидность лимитным ордером, Taker забирает доступную ликвидность. Ставки комиссии могут отличаться.
                </p>
              </article>

              <article>
                <h4>
                  Плечо
                </h4>

                <p>
                  Позволяет уменьшить собственную маржу для позиции. Максимальное плечо ограничивается параметрами выбранного инструмента.
                </p>
              </article>
            </div>

            <div className="example-box">
              <h3>
                Пример расчёта
              </h3>

              <p>
                <b>
                  Депозит:
                </b>{" "}

                1 000 USDT ·{" "}

                <b>
                  Риск:
                </b>{" "}

                1,5% → 15 USDT.
              </p>

              <p>
                <b>
                  Размер позиции:
                </b>{" "}

                5 000 USDT ·{" "}

                <b>
                  Плечо:
                </b>{" "}

                10x → необходимая маржа около 500 USDT.
              </p>

              <p>
                Если движение до Take Profit даёт 150 USDT валовой прибыли, а ориентировочная комиссия входа и выхода составляет около 5 USDT, потенциальная прибыль после комиссии будет около{" "}

                <b>
                  145 USDT
                </b>.
              </p>
            </div>

            <p className="disclaimer">
              Funding, проскальзывание и персональные VIP-ставки комиссии пока не включены в базовый расчёт.
            </p>
          </div>
        </div>
      )}

      {/* SHARE */}

      {shareOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={() =>
            setShareOpen(
              false
            )
          }
        >
          <div
            className="share-modal"
            onMouseDown={(
              event
            ) =>
              event.stopPropagation()
            }
          >
            <button
              className="modal-close"
              onClick={() =>
                setShareOpen(
                  false
                )
              }
            >
              ×
            </button>

            <div className="modal-kicker">
              ПОДЕЛИТЬСЯ РАСЧЁТОМ
            </div>

            <h2>
              {displaySymbol} ·{" "}
              {side} ·{" "}
              {leverage}x
            </h2>

            <canvas
              ref={
                sharePreviewRef
              }
              className="share-preview"
            />

            <div className="share-actions">
              <button
                className="secondary"
                onClick={
                  downloadShareImage
                }
              >
                Скачать PNG
              </button>

              <button
                className="primary"
                onClick={() =>
                  void nativeShare()
                }
              >
                Поделиться ↗
              </button>
            </div>

            <p className="share-note">
              На карточке не показываются депозит и персональные данные — только параметры и результат конкретной сделки.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}