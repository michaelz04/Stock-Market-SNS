import { useState } from "react";
import "./PortfolioDetails.css";
import CashAccount from "./CashAccount";
import StockHolding from "./StockHolding";

function PortfolioDetails({ portfolioId, onBack }) {
  const [showCashAccount, setShowCashAccount] = useState(true);

  return (
    <div className="portfolio-details">
      <h1>Portfolio: {portfolioId}</h1>
      <div className="switch-buttons">
        <div className="switch-button" onClick={() => setShowCashAccount(true)}>
          Cash Account
        </div>
        <div
          className="switch-button"
          onClick={() => setShowCashAccount(false)}
        >
          Stock Holdings
        </div>
        <div className="back" onClick={onBack}>
          Back to Portfolios
        </div>
      </div>
      <div className="body">
        {showCashAccount ? (
          <CashAccount portfolioId={portfolioId} />
        ) : (
          <StockHolding portfolioId={portfolioId} />
        )}
      </div>
    </div>
  );
}

export default PortfolioDetails;
