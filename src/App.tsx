import { useEffect, useMemo, useState } from "react";

type Market = "crypto" | "tradfi";
type Side = "LONG" | "SHORT";
type FeeSide = "Taker" | "Maker";

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
};

const fallbackCrypto: Contract[] = [
  { symbol: "BTC-USDT", asset: "BTC", currency: "USDT", pricePrecision: 2, quantityPrecision: 4, makerFeeRate: 0.0002, takerFeeRate: 0.0005, tradeMinUSDT: 2, maxLongLeverage: 125, maxShortLeverage: 125 },
  { symbol: "ETH-USDT", asset: "ETH", currency: "USDT", pricePrecision: 2, quantityPrecision: 3, makerFeeRate: 0.0002, takerFeeRate: 0.0005, tradeMinUSDT: 2, maxLongLeverage: 100, maxShortLeverage: 100 },
  { symbol: "SOL-USDT", asset: "SOL", currency: "USDT", pricePrecision: 3, quantityPrecision: 2, makerFeeRate: 0.0002, takerFeeRate: 0.0005, tradeMinUSDT: 2, maxLongLeverage: 100, maxShortLeverage: 100 },
  { symbol: "XRP-USDT", asset: "XRP", currency: "USDT", pricePrecision: 5, quantityPrecision: 0, makerFeeRate: 0.0002, takerFeeRate: 0.0005, tradeMinUSDT: 2, maxLongLeverage: 50, maxShortLeverage: 50 },
  { symbol: "DOGE-USDT", asset: "DOGE", currency: "USDT", pricePrecision: 6, quantityPrecision: 0, makerFeeRate: 0.0002, takerFeeRate: 0.0005, tradeMinUSDT: 2, maxLongLeverage: 50, maxShortLeverage: 50 },
  { symbol: "BNB-USDT", asset: "BNB", currency: "USDT", pricePrecision: 2, quantityPrecision: 2, makerFeeRate: 0.0002, takerFeeRate: 0.0005, tradeMinUSDT: 2, maxLongLeverage: 75, maxShortLeverage: 75 },
];

const fallbackTradfi: Contract[] = [
  { symbol: "GOLD-USDT", asset: "GOLD", currency: "USDT", pricePrecision: 2, quantityPrecision: 3, makerFeeRate: 0.0002, takerFeeRate: 0.0005, tradeMinUSDT: 2, maxLongLeverage: 100, maxShortLeverage: 100 },
  { symbol: "TSLA-USDT", asset: "TSLA", currency: "USDT", pricePrecision: 2, quantityPrecision: 3, makerFeeRate: 0.0002, takerFeeRate: 0.0005, tradeMinUSDT: 2, maxLongLeverage: 20, maxShortLeverage: 20 },
  { symbol: "AAPL-USDT", asset: "AAPL", currency: "USDT", pricePrecision: 2, quantityPrecision: 3, makerFeeRate: 0.0002, takerFeeRate: 0.0005, tradeMinUSDT: 2, maxLongLeverage: 20, maxShortLeverage: 20 },
  { symbol: "EUR-USDT", asset: "EUR", currency: "USDT", pricePrecision: 5, quantityPrecision: 2, makerFeeRate: 0.0002, takerFeeRate: 0.0005, tradeMinUSDT: 2, maxLongLeverage: 100, maxShortLeverage: 100 },
];

function n(value: string | number) {
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function fmt(value: number, digits = 2) {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
}

function pct(value: number, digits = 2) {
  return `${fmt(value, digits)}%`;
}

function normalizeSymbol(symbol: string) {
  return symbol.toUpperCase().trim().replace("/", "-").replace("_", "-").replace("-PERP", "");
}

function isTradFiSymbol(symbol: string) {
  const s = symbol.toUpperCase();
  const knownTradFi = ["GOLD", "SILVER", "OIL", "WTI", "BRENT", "TSLA", "AAPL", "MSFT", "META", "NVDA", "GOOGL", "AMZN", "SPY", "QQQ", "SP500", "NASDAQ", "DOW", "NIKKEI", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "NZD", "HK", "COPPER", "COCOA", "SOY", "NATGAS"];
  return knownTradFi.some((x) => s.includes(x));
}

async function apiGet<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (data?.code !== undefined && data.code !== 0) throw new Error(data.msg || "BingX API error");
  return data;
}

export default function App() {
  const [market, setMarket] = useState<Market>("crypto");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [query, setQuery] = useState("BTC");
  const [selected, setSelected] = useState<Contract>(fallbackCrypto[0]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [price, setPrice] = useState(112438.2);
  const [live, setLive] = useState(true);
  const [side, setSide] = useState<Side>("LONG");
  const [balance, setBalance] = useState(10000);
  const [riskPercent, setRiskPercent] = useState(1);
  const [entry, setEntry] = useState(110000);
  const [stop, setStop] = useState(107800);
  const [takeProfit, setTakeProfit] = useState(116600);
  const [leverage, setLeverage] = useState(10);
  const [feeSide] = useState<FeeSide>("Taker");
  const [manualPrice, setManualPrice] = useState(false);
  const [saved, setSaved] = useState(false);
  const [, setLoadingContracts] = useState(false);
  const [apiMessage, setApiMessage] = useState("");

  const riskAmount = balance * riskPercent / 100;
  const stopDistance = Math.abs(entry - stop);
  const stopDistancePct = entry > 0 ? stopDistance / entry : 0;
  const tpDistance = Math.abs(takeProfit - entry);
  const tpDistancePct = entry > 0 ? tpDistance / entry : 0;
  const positionSize = stopDistancePct > 0 ? riskAmount / stopDistancePct : 0;
  const quantity = entry > 0 ? positionSize / entry : 0;
  const margin = leverage > 0 ? positionSize / leverage : 0;
  const rr = stopDistance > 0 ? tpDistance / stopDistance : 0;
  const profit = positionSize * tpDistancePct;
  const feeRate = feeSide === "Maker"
    ? (selected.makerFeeRate ?? 0.0002)
    : (selected.takerFeeRate ?? 0.0005);
  const entryFee = positionSize * feeRate;
  
  const activeContracts = useMemo(() => {
    const source = contracts.length ? contracts : market === "crypto" ? fallbackCrypto : fallbackTradfi;
    return source.filter((c) => {
      const tradfi = isTradFiSymbol(c.symbol);
      return market === "tradfi" ? tradfi : !tradfi;
    });
  }, [contracts, market]);

  const suggestions = useMemo(() => {
    const q = query.trim().toUpperCase();
    return activeContracts
      .filter((c) => c.symbol.replace("-USDT", "").includes(q) || c.symbol.includes(q))
      .slice(0, 8);
  }, [activeContracts, query]);

  async function loadContracts() {
    setLoadingContracts(true);
    setApiMessage("");
    try {
      const result = await apiGet<{ data: Contract[] }>("/api/bingx?action=contracts");
      const list = Array.isArray(result.data) ? result.data : [];
      setContracts(list);
      const current = list.find((c) => normalizeSymbol(c.symbol) === normalizeSymbol(selected.symbol));
      if (current) setSelected(current);
      setApiMessage("Данные BingX обновлены");
    } catch {
      setContracts([]);
      setApiMessage("BingX пока недоступен — используются базовые данные. Цена и тикер можно изменить вручную.");
    } finally {
      setLoadingContracts(false);
    }
  }

  async function loadTicker(contract: Contract) {
    setApiMessage("");
    try {
      const result = await apiGet<{ data: { lastPrice?: string; markPrice?: string } }>("/api/bingx?action=ticker&symbol=" + encodeURIComponent(normalizeSymbol(contract.symbol)));
      const next = n(result.data?.lastPrice || result.data?.markPrice || 0);
      if (next > 0 && !manualPrice) {
        setPrice(next);
        setEntry(next);
        const stopPct = 0.02;
        const tpPct = 0.06;
        setStop(next * (side === "LONG" ? 1 - stopPct : 1 + stopPct));
        setTakeProfit(next * (side === "LONG" ? 1 + tpPct : 1 - tpPct));
      }
      setLive(next > 0);
      if (next > 0) setApiMessage("LIVE • цена BingX");
    } catch {
      setLive(false);
      setApiMessage("Не удалось получить цену BingX. Вы по-прежнему можете ввести цену вручную.");
    }
  }

  useEffect(() => {
    loadContracts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market]);

  useEffect(() => {
    if (selected) {
      setQuery(selected.symbol.replace(/-USDT$/i, ""));
      if (!manualPrice) loadTicker(selected);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  function selectContract(contract: Contract) {
    setSelected(contract);
    setSuggestionsOpen(false);
    setManualPrice(false);
  }

  function changeSide(next: Side) {
    setSide(next);
    const stopPct = 0.02;
    const tpPct = 0.06;
    setStop(entry * (next === "LONG" ? 1 - stopPct : 1 + stopPct));
    setTakeProfit(entry * (next === "LONG" ? 1 + tpPct : 1 - tpPct));
  }

  function saveDeal() {
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  const maxLeverage = side === "LONG"
    ? selected.maxLongLeverage ?? 125
    : selected.maxShortLeverage ?? 125;

  const positionLabel = market === "crypto" ? "Бессрочные фьючерсы" : "TradFi • бессрочные фьючерсы";
  const displaySymbol = selected.symbol.replace(/-USDT$/i, "");

  return (
    <div className="site">
      <header className="header container">
        <div className="brand">
          <div className="brand-mark"><span>D</span><i>O</i></div>
          <div>
            <div className="brand-name">TRADE CALCULATOR</div>
            <div className="brand-subtitle">Рассчитай сделку до входа</div>
          </div>
        </div>
        <nav className="top-nav">
          <a href="#calculator">Калькулятор</a>
          <a href="#tools">Инструменты</a>
          <a href="#about">О проекте</a>
          <button className="saved-button" onClick={saveDeal}>
            {saved ? "Сделка сохранена" : "Сохраненные сделки"} <span>♡</span>
          </button>
        </nav>
      </header>

      <main className="container">
        <section className="market-tabs">
          <button className={market === "crypto" ? "active" : ""} onClick={() => setMarket("crypto")}>
            <span className="tab-icon">⌁</span> CRYPTO
          </button>
          <button className={market === "tradfi" ? "active" : ""} onClick={() => setMarket("tradfi")}>
            <span className="tab-icon">◌</span> TRADFI
          </button>
        </section>

        <section id="calculator" className="calculator-shell">
          <div className="left-panel">
            <div className="form-section">
              <div className="section-title"><b>01.</b> СЧЕТ</div>

              <div className="field-row">
                <label>Валюта счета</label>
                <div className="select-like">USDT <span>⌄</span></div>
              </div>

              <div className="field-row">
                <label>Депозит</label>
                <div className="input-suffix"><input type="number" value={balance} onChange={(e) => setBalance(n(e.target.value))}/><span>USDT</span></div>
              </div>

              <div className="field-row">
                <label>Риск на сделку</label>
                <div className="input-suffix"><input type="number" step="0.1" value={riskPercent} onChange={(e) => setRiskPercent(n(e.target.value))}/><span>%</span></div>
              </div>

              <div className="risk-card">
                <span>Максимальный риск</span>
                <strong>{fmt(riskAmount)} <small>USDT</small></strong>
              </div>
            </div>

            <div className="form-section trade-section">
              <div className="section-title"><b>02.</b> ТОРГОВЛЯ</div>
              <div className="field-label">Тип сделки</div>
              <div className="side-buttons">
                <button className={side === "LONG" ? "chosen long" : ""} onClick={() => changeSide("LONG")}>LONG ↗</button>
                <button className={side === "SHORT" ? "chosen short" : ""} onClick={() => changeSide("SHORT")}>SHORT ↓</button>
              </div>

              <div className="field-label ticker-label">{positionLabel}</div>
              <div className="ticker-wrap">
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value.toUpperCase()); setSuggestionsOpen(true); }}
                  onFocus={() => setSuggestionsOpen(true)}
                  placeholder="BTC"
                />
                <span className="exchange">BingX <b>⌄</b></span>
                {suggestionsOpen && suggestions.length > 0 && (
                  <div className="suggestions">
                    {suggestions.map((c) => (
                      <button key={c.symbol} onMouseDown={(e) => e.preventDefault()} onClick={() => selectContract(c)}>
                        <strong>{c.symbol.replace(/-USDT$/i, "")}</strong><span>{c.symbol}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="live-price">
                <div>
                  <span>Текущая цена <em>{live ? "LIVE" : "MANUAL"}</em></span>
                  <strong>{fmt(price, selected.pricePrecision ?? 2)} <small>USDT</small></strong>
                </div>
                <div className="price-actions">
                  <button title="Обновить" onClick={() => loadTicker(selected)}>↻</button>
                  <button title="Изменить" onClick={() => { setManualPrice(true); }}>⌕</button>
                </div>
              </div>

              <div className="field-row">
                <label>Цена входа</label>
                <div className="input-suffix"><input type="number" value={entry} onChange={(e) => setEntry(n(e.target.value))}/><span>USDT</span></div>
              </div>
              <div className="field-row">
                <label>Stop Loss</label>
                <div className="input-suffix"><input type="number" value={stop} onChange={(e) => setStop(n(e.target.value))}/><span>USDT</span></div>
              </div>
              <div className="field-row">
                <label>Take Profit</label>
                <div className="input-suffix"><input type="number" value={takeProfit} onChange={(e) => setTakeProfit(n(e.target.value))}/><span>USDT</span></div>
              </div>
              <div className="field-row">
                <label>Плечо</label>
                <div className="select-like"><select value={leverage} onChange={(e) => setLeverage(n(e.target.value))}>{[1,2,3,5,10,15,20,25,50,75,100].filter(x => x <= maxLeverage).map(x => <option key={x} value={x}>{x}x</option>)}</select><span>⌄</span></div>
              </div>

              <button className="advanced">› &nbsp; Дополнительные параметры</button>
              <div className="calculate-row">
                <button className="calculate" onClick={() => window.scrollTo({ top: 300, behavior: "smooth" })}>РАССЧИТАТЬ</button>
                <button className="reset" onClick={() => { setBalance(10000); setRiskPercent(1); setEntry(price); setStop(price * .98); setTakeProfit(price * 1.06); setLeverage(10); }}>↻</button>
              </div>
            </div>
          </div>

          <div className="right-panel">
            <div className="results-head">
              <div className="section-title">РЕЗУЛЬТАТЫ</div>
              <button className="save-small" onClick={saveDeal}>{saved ? "Сохранено" : "Сохранить сделку"} ♡</button>
            </div>

            <div className="big-results">
              <div><span>РАЗМЕР ПОЗИЦИИ</span><strong>{fmt(positionSize)}</strong><small>USDT</small></div>
              <div><span>РИСК</span><strong>{fmt(riskAmount)}</strong><small>USDT<br/>{pct(riskPercent, 0)} от депозита</small></div>
              <div><span>ПОТЕНЦИАЛЬНАЯ ПРИБЫЛЬ</span><strong>{fmt(profit)}</strong><small>USDT<br/>{pct(profit / Math.max(balance,1) * 100)} от депозита</small></div>
            </div>

            <div className="mini-results">
              <div><span>R:R</span><strong>1 : {fmt(rr, 2)}</strong></div>
              <div><span>Маржа</span><strong>{fmt(margin)} <small>USDT</small></strong></div>
              <div><span>Комиссия (ориент.)</span><strong>{fmt(entryFee)} <small>USDT</small></strong></div>
              <div><span>Стоп дистанция</span><strong>{pct(stopDistancePct * 100)}</strong></div>
            </div>

            <div className="chart-card">
              <div className="price-chart">
                <div className="tp-line" style={{ top: "18%" }}><span>Take Profit<br/><b>{fmt(takeProfit, 0)}</b></span><i></i></div>
                <div className="entry-line" style={{ top: "50%" }}><span>Entry<br/><b>{fmt(entry, 0)}</b></span><i></i></div>
                <div className="sl-line" style={{ top: "82%" }}><span>Stop Loss<br/><b>{fmt(stop, 0)}</b></span><i></i></div>
                <div className="vertical-price"></div>
                <div className="price-marker tp-marker" style={{ top: "18%" }}>+{fmt(profit)} USDT<br/><b>+{pct(profit / Math.max(positionSize,1) * 100)}</b></div>
                <div className="price-marker entry-marker" style={{ top: "50%" }}>ENTRY<br/><b>{fmt(entry, 0)} USDT</b></div>
                <div className="price-marker sl-marker" style={{ top: "82%" }}>-{fmt(riskAmount)} USDT<br/><b>-{pct(riskPercent, 0)}</b></div>
              </div>
              <div className="chart-footer">
                <span>Расстояние до TP: {fmt(tpDistance)} ({pct(tpDistancePct * 100)})</span>
                <span>Расстояние до SL: {fmt(stopDistance)} ({pct(stopDistancePct * 100)})</span>
              </div>
            </div>

            <div className="details-card">
              <h4>ДЕТАЛИ РАСЧЕТА</h4>
              <div className="details-grid">
                <div><span>Размер позиции</span><b>{fmt(positionSize)} USDT</b></div>
                <div><span>Риск на 1 {displaySymbol}</span><b>{fmt(stopDistance)} USDT</b></div>
                <div><span>Количество ({displaySymbol})</span><b>{fmt(quantity, selected.quantityPrecision ?? 4)}</b></div>
                <div><span>Плечо</span><b>{leverage}x</b></div>
                <div><span>Стоимость позиции</span><b>{fmt(positionSize)} USDT</b></div>
                <div><span>Комиссия ({feeSide})</span><b>{pct(feeRate * 100, 3)}</b></div>
                <div><span>Маржа ({leverage}x)</span><b>{fmt(margin)} USDT</b></div>
                <div><span>Тип комиссии</span><b>{feeSide} / {feeSide}</b></div>
              </div>
            </div>

            <div className="status-card">
              <div className="status-icon">i</div>
              <div><strong>{apiMessage || "Данные о цене и комиссии получены из BingX"}</strong><span>Комиссия зависит от выбранного инструмента и типа ордера.</span></div>
              <small>Обновлено: {new Date().toLocaleTimeString("ru-RU", {hour: "2-digit", minute: "2-digit"})} &nbsp; ↻</small>
            </div>
          </div>
        </section>

        <section className="how-section">
          <h2>КАК ЭТО РАБОТАЕТ?</h2>
          <div className="steps">
            {[
              ["01", "УКАЖИТЕ ПАРАМЕТРЫ", "Введите депозит, риск и параметры сделки", "☑"],
              ["02", "МЫ РАССЧИТАЕМ", "Калькулятор автоматически рассчитает позицию и риск", "◉"],
              ["03", "АНАЛИЗИРУЙТЕ", "Оцените соотношение риска к прибыли и параметры", "⌁"],
              ["04", "ПРИНИМАЙТЕ РЕШЕНИЕ", "Используйте расчет для уверенного входа в сделку", "♧"],
            ].map(([num,title,text,icon]) => (
              <div className="step" key={num}><div className="step-icon">{icon}</div><div><b>{num}. {title}</b><p>{text}</p></div></div>
            ))}
          </div>
        </section>

        <section className="cta-section" id="tools">
          <div>
            <h2>СОХРАНЯЙТЕ И АНАЛИЗИРУЙТЕ СВОИ СДЕЛКИ</h2>
            <p>Создайте учетную запись, чтобы сохранять сделки,<br/>отслеживать статистику и анализировать результаты.</p>
            <button onClick={saveDeal}>Создать аккаунт</button>
          </div>
          <div className="dashboard-preview">
            <div className="fake-dashboard">
              <div className="fake-sidebar"></div><div className="fake-chart"></div><div className="fake-list"></div>
            </div>
          </div>
        </section>
      </main>

      <footer id="about">
        <div className="footer-inner container">
          <div className="footer-brand"><div className="brand-mark large"><span>D</span><i>O</i></div><small>OZDEN</small></div>
          <div><h4>О ПРОЕКТЕ</h4><p>Профессиональные инструменты<br/>для трейдеров и инвесторов.<br/>Принимайте взвешенные решения<br/>и управляйте рисками.</p></div>
          <div><h4>ИНСТРУМЕНТЫ</h4><p>Калькулятор позиции<br/>Калькулятор риска<br/>Калькулятор прибыли<br/>Калькулятор усреднения<br/>Калькулятор ликвидации</p></div>
          <div><h4>ПОДДЕРЖКА</h4><p>FAQ<br/>Инструкции<br/>Обратная связь<br/>Политика конфиденциальности<br/>Условия использования</p></div>
          <div><h4>СЛЕДИТЕ ЗА НОВОСТЯМИ</h4><div className="socials"><span>➤</span><span>▶</span><span>◎</span></div><p className="copyright">© 2026 Trade Calculator. Все права защищены.</p></div>
        </div>
      </footer>
    </div>
  );
}
