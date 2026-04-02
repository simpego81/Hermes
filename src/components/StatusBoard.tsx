/* Hermes quality gate summary card. */
const qualityGates = [
  'Electron + React scaffold ready',
  'GitHub Actions workflows configured',
  'Jest coverage reporting enabled',
  'ESLint and Prettier enforced',
];

export function StatusBoard() {
  return (
    <article className="card status-board">
      <h2>Repository Baseline</h2>
      <ul className="status-list">
        {qualityGates.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </article>
  );
}
