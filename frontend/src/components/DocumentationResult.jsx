function DocumentationResult({ data }) {
  if (!data) {
    return null;
  }

  return (
    <div className="agent-result">

      <h3>📄 Project Documentation</h3>


      {/* ==================================================
          USER STORIES
      ================================================== */}

      <div className="result-section">

        <h4>👤 User Stories</h4>

        {data.user_stories?.length > 0 ? (

          <ul>
            {data.user_stories.map((story, index) => (

              <li key={index}>
                {story.user_story || "-"}
              </li>

            ))}
          </ul>

        ) : (

          <p>
            No user stories identified.
          </p>

        )}

      </div>


      {/* ==================================================
          RISK REGISTER
      ================================================== */}

      <div className="result-section">

        <h4>⚠️ Risk Register</h4>

        {data.risk_register?.length > 0 ? (

          <div className="table-container">

            <table>

              <thead>

                <tr>
                  <th>Risk</th>
                  <th>Risk Type</th>
                  <th>Probability</th>
                  <th>Impact</th>
                  <th>Mitigation</th>
                </tr>

              </thead>

              <tbody>

                {data.risk_register.map(
                  (risk, index) => (

                    <tr key={index}>

                      <td>
                        {risk.risk || "-"}
                      </td>

                      <td>
                        {risk.risk_type || "-"}
                      </td>

                      <td>
                        {risk.probability || "-"}
                      </td>

                      <td>
                        {risk.impact || "-"}
                      </td>

                      <td>
                        {risk.mitigation || "-"}
                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        ) : (

          <p>
            ✅ No risks identified.
          </p>

        )}

      </div>


      {/* ==================================================
          ACTION ITEMS
      ================================================== */}

      <div className="result-section">

        <h4>✅ Action Items</h4>

        {data.action_items?.length > 0 ? (

          <div className="table-container">

            <table>

              <thead>

                <tr>
                  <th>Action</th>
                  <th>Responsible Team</th>
                  <th>Due Date</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>

              </thead>

              <tbody>

                {data.action_items.map(
                  (item, index) => (

                    <tr key={index}>

                      <td>
                        {item.action || "-"}
                      </td>

                      <td>
                        {item.responsible_team || "-"}
                      </td>

                      <td>
                        {item.due_date || "-"}
                      </td>

                      <td>
                        {item.priority || "-"}
                      </td>

                      <td>
                        {item.status || "-"}
                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        ) : (

          <p>
            No action items identified.
          </p>

        )}

      </div>

    </div>
  );
}

export default DocumentationResult;