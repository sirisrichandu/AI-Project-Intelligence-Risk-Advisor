function ScopeResult({ data }) {
  if (!data) {
    return null;
  }

  return (
    <div className="agent-result">

      <h3>📋 Project Scope Analysis</h3>

      {/* Project Goal */}
      <div className="result-section">
        <h4>🎯 Project Goal</h4>

        <p>
          {data.project_goal || "Not specified"}
        </p>
      </div>


      {/* Project Scope */}
      <div className="result-section">

        <h4>📌 Project Scope</h4>

        <strong>Included:</strong>

        {data.project_scope?.included?.length > 0 ? (
          <ul>
            {data.project_scope.included.map(
              (item, index) => (
                <li key={index}>{item}</li>
              )
            )}
          </ul>
        ) : (
          <p>None specified</p>
        )}


        <strong>Excluded:</strong>

        {data.project_scope?.excluded?.length > 0 ? (
          <ul>
            {data.project_scope.excluded.map(
              (item, index) => (
                <li key={index}>{item}</li>
              )
            )}
          </ul>
        ) : (
          <p>None specified</p>
        )}

      </div>


      {/* Deliverables */}
      <div className="result-section">

        <h4>📦 Major Deliverables</h4>

        {data.deliverables?.length > 0 ? (
          <ul>
            {data.deliverables.map(
              (item, index) => (
                <li key={index}>{item}</li>
              )
            )}
          </ul>
        ) : (
          <p>No deliverables specified.</p>
        )}

      </div>


      {/* Milestones */}
      <div className="result-section">

        <h4>📅 Milestones</h4>

        {data.milestones?.length > 0 ? (

          <div className="table-container">

            <table>

              <thead>
                <tr>
                  <th>Name</th>
                  <th>Target Date</th>
                  <th>Responsible Team</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>

                {data.milestones.map(
                  (milestone, index) => (

                    <tr key={index}>

                      <td>
                        {milestone.name || "-"}
                      </td>

                      <td>
                        {milestone.target_date || "-"}
                      </td>

                      <td>
                        {milestone.responsible_team || "-"}
                      </td>

                      <td>
                        {milestone.status || "-"}
                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        ) : (
          <p>No milestones specified.</p>
        )}

      </div>


      {/* Timelines */}
      <div className="result-section">

        <h4>⏱️ Timelines</h4>

        {data.timelines?.length > 0 ? (

          <ul>

            {data.timelines.map(
              (timeline, index) => (

                <li key={index}>

                  <strong>
                    {timeline.milestone}
                  </strong>

                  : {timeline.date}

                </li>

              )
            )}

          </ul>

        ) : (
          <p>No timelines specified.</p>
        )}

      </div>


      {/* Responsibilities */}
      <div className="result-section">

        <h4>👥 Responsibilities</h4>

        {data.responsibilities?.length > 0 ? (

          <ul>

            {data.responsibilities.map(
              (item, index) => (

                <li key={index}>

                  <strong>
                    {item.team}
                  </strong>

                  : {item.responsibility}

                </li>

              )
            )}

          </ul>

        ) : (
          <p>No responsibilities specified.</p>
        )}

      </div>

    </div>
  );
}

export default ScopeResult;