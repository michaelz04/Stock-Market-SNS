import { useState } from "react";
import "./PortfolioDetails.css";
import CashAccount from "./CashAccount";
import StockHolding from "./StockHolding";
import PortfolioStatistics from "./PortfolioStatistics";

function PortfolioDetails({ portfolioId, onBack }) {
  const [activeView, setActiveView] = useState("cash");

  return (
    <div className="portfolio-details">
      <h1>Portfolio: {portfolioId}</h1>
      <div className="switch-buttons">
        <div className="switch-button" onClick={() => setActiveView("cash")}>
          Cash Account
        </div>
        <div className="switch-button" onClick={() => setActiveView("stock")}>
          Stock Holdings
        </div>
        <div className="switch-button" onClick={() => setActiveView("stats")}>
          Portfolio Statistics
        </div>
        <div className="back" onClick={onBack}>
          Back to Portfolios
        </div>
      </div>
      <div className="body">
        {activeView === "cash" && <CashAccount portfolioId={portfolioId} />}
        {activeView === "stock" && <StockHolding portfolioId={portfolioId} />}
        {activeView === "stats" && <PortfolioStatistics portfolioId={portfolioId} />}
      </div>
    </div>
  );
}

export default PortfolioDetails;
