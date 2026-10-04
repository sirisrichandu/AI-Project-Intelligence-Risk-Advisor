function BlockerResult({ data }) {
  if (!data) {
    return null;
  }

  return (
    <div className="agent-result">

      <h3>🚧 Blockers & Action Items</h3>

      {/* Blockers */}
      <div className="result-section">

        <h4>🚫 Current Blockers</h4>

        {data.blockers?.length > 0 ? (

          <div className="table-container">

            <table>

              <thead>
                <tr>
                  <th>Description</th>
                  <th>Type</th>
                  <th>Affected Area</th>
                  <th>Impact</th>
                </tr>
              </thead>

              <tbody>

                {data.blockers.map(
                  (blocker, index) => (

                    <tr key={index}>

                      <td>
                        {blocker.description || "-"}
                      </td>

                      <td>
                        {blocker.blocker_type || "-"}
                      </td>

                      <td>
                        {blocker.affected_area || "-"}
                      </td>

                      <td>
                        {blocker.impact || "-"}
                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        ) : (
          <p>✅ No current blockers identified.</p>
        )}

      </div>


      {/* Action Items */}
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
          <p>No action items identified.</p>
        )}

      </div>


      {/* Pending Decisions */}
      <div className="result-section">

        <h4>🤔 Pending Decisions</h4>

        {data.pending_decisions?.length > 0 ? (

          <ul>

            {data.pending_decisions.map(
              (decision, index) => (

                <li key={index}>

                  <strong>
                    {decision.decision}
                  </strong>

                  {decision.responsible_team && (
                    <>
                      {" — "}
                      {decision.responsible_team}
                    </>
                  )}

                  {decision.impact && (
                    <>
                      {" — Impact: "}
                      {decision.impact}
                    </>
                  )}

                </li>

              )
            )}

          </ul>

        ) : (
          <p>No pending decisions identified.</p>
        )}

      </div>


      {/* Unresolved Issues */}
      <div className="result-section">

        <h4>🔧 Unresolved Issues</h4>

        {data.unresolved_issues?.length > 0 ? (

          <ul>

            {data.unresolved_issues.map(
              (issue, index) => (

                <li key={index}>

                  <strong>
                    {issue.issue}
                  </strong>

                  {issue.affected_area && (
                    <>
                      {" — "}
                      {issue.affected_area}
                    </>
                  )}

                  {issue.impact && (
                    <>
                      {" — Impact: "}
                      {issue.impact}
                    </>
                  )}

                </li>

              )
            )}

          </ul>

        ) : (
          <p>No unresolved issues identified.</p>
        )}

      </div>

    </div>
  );
}

export default BlockerResult;