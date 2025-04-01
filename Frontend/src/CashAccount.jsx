import { useState, useEffect } from "react";
import axios from "axios";
import "./CashAccount.css";

function CashAccount({ portfolioId }) {
  const user = localStorage.getItem("user");
  const [transferAmount, setTransferAmount] = useState(0);
  const [transferPortfolio, setTransferPortfolio] = useState(0);
  const [transactionError, setTransactionError] = useState("");
  const [transferError, setTransferError] = useState("");
  const [deposit, setDeposit] = useState(0);
  const [withdraw, setWithdraw] = useState(0);
  const [refresh, setRefresh] = useState(false);
  const [cash, setCash] = useState(0);
  const [cashHistory, setCashHistory] = useState([]);

  useEffect(() => {
    const fetchPortfolios = async () => {
      try {
        const response = await axios.post(
          "http://localhost:3001/portfoliodetails",
          {
            user,
            portfolioId,
          }
        );
        const { cash } = response.data.cash[0];
        const { cashHistory } = response.data;
        setCash(cash);
        setCashHistory(cashHistory);
      } catch (error) {
        console.error("Error fetching portfolios:", error);
      }
    };

    fetchPortfolios();
  }, [user, refresh]);

  function handleTransfer(event) {
    event.preventDefault();

    axios
      .post("http://localhost:3001/portfoliotransfer", {
        user,
        portfolioId,
        transferAmount,
        transferPortfolio,
      })
      .then((res) => {
        if (res.data.message == "success") {
          // success
          setRefresh((prev) => !prev);
          setTransferError("");
        }
      })
      .catch((err) => {
        setTransferError("Error Transfering");
        console.log(err);
      });
  }

  function handleDeposit(event) {
    event.preventDefault();

    axios
      .post("http://localhost:3001/portfoliodeposit", {
        user,
        portfolioId,
        deposit,
      })
      .then((res) => {
        if (res.data.message == "success") {
          // success
          setRefresh((prev) => !prev);
          setTransactionError("");
        }
      })
      .catch((err) => {
        setTransactionError("Error Depositing/Withdrawing");
        console.log(err);
      });
  }

  function handleWithdraw(event) {
    event.preventDefault();

    axios
      .post("http://localhost:3001/portfoliowithdraw", {
        user,
        portfolioId,
        withdraw,
      })
      .then((res) => {
        if (res.data.message == "success") {
          // success
          setRefresh((prev) => !prev);
          setTransactionError("");
        }
      })
      .catch((err) => {
        setTransactionError("Error Depositing/Withdrawing");
        console.log(err);
      });
  }

  return (
    <div className="body">
      <h2>Cash Account</h2>
      <h3>Cash: {cash}</h3>
      <div className="input-container">
        <div className="input">
          <input
            type="text"
            placeholder="Deposit"
            onChange={(e) => setDeposit(e.target.value)}
          />
        </div>
        <div className="input-button" onClick={handleDeposit}>
          Deposit
        </div>
      </div>
      <div className="input-container">
        <div className="input">
          <input
            type="text"
            placeholder="Withdraw"
            onChange={(e) => setWithdraw(e.target.value)}
          />
        </div>
        <div className="input-button" onClick={handleWithdraw}>
          Withdraw
        </div>
      </div>
      {transactionError && <p className="error">{transactionError}</p>}
      <h3>Transfer</h3>
      <div className="input-container">
        <div className="input">
          <input
            type="text"
            placeholder="Amount"
            onChange={(e) => setTransferAmount(e.target.value)}
          />
        </div>
        <div className="input">
          <input
            type="text"
            placeholder="Portfolio"
            onChange={(e) => setTransferPortfolio(e.target.value)}
          />
        </div>
        <div className="input-button" onClick={handleTransfer}>
          Transfer
        </div>
      </div>
      {transferError && <p className="error">{transferError}</p>}
      <h3>Transaction History</h3>
      <ul>
        {cashHistory.length > 0 ? (
          cashHistory.map((transaction) => (
            <div>
              <li className="transactions">
                <div>
                  <div>Transaction: {transaction.transact}</div>
                  <div>Amount: {transaction.amount}</div>
                </div>
              </li>
            </div>
          ))
        ) : (
          <p>No Transactions</p>
        )}
      </ul>
    </div>
  );
}

export default CashAccount;
