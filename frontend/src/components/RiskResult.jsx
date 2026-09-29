function RiskResult({ data }) {
  if (!data) {
    return null;
  }

  return (
    <div className="agent-result">

      <h3>⚠️ Risk Analysis</h3>

      {/* Risks */}
      <div className="result-section">

        <h4>Identified Risks</h4>

        {data.risks?.length > 0 ? (

          <div className="table-container">

            <table>

              <thead>
                <tr>
                  <th>Risk Type</th>
                  <th>Description</th>
                  <th>Probability</th>
                  <th>Impact</th>
                  <th>Affected Area</th>
                  <th>Recommended Action</th>
                </tr>
              </thead>

              <tbody>

                {data.risks.map(
                  (risk, index) => (

                    <tr key={index}>

                      <td>
                        {risk.risk_type || "-"}
                      </td>

                      <td>
                        {risk.description || "-"}
                      </td>

                      <td>
                        {risk.probability || "-"}
                      </td>

                      <td>
                        {risk.impact || "-"}
                      </td>

                      <td>
                        {risk.affected_area || "-"}
                      </td>

                      <td>
                        {risk.recommended_action || "-"}
                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        ) : (
          <p>✅ No future risks identified.</p>
        )}

      </div>


      {/* Delivery Forecast */}
      {data.delivery_forecast && (

        <div className="result-section">

          <h4>📊 Delivery Forecast</h4>

          <p>
            <strong>Status:</strong>{" "}
            {data.delivery_forecast.status || "-"}
          </p>

          <p>
            <strong>Reasoning:</strong>{" "}
            {data.delivery_forecast.reasoning || "-"}
          </p>

        </div>

      )}

    </div>
  );
}

export default RiskResult;