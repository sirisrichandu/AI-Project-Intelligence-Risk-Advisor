function GeneralResult({ data }) {
  if (!data) {
    return null;
  }

  return (
    <div className="agent-result">

      <h3>💬 Project Assistant</h3>

      <p>
        {typeof data === "string"
          ? data
          : JSON.stringify(data, null, 2)}
      </p>

    </div>
  );
}

export default GeneralResult;