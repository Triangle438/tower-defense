export function MessageLog({ messages }: { messages: string[] }) {
  return (
    <section className="panel" aria-label="Message log">
      <ul className="log" aria-live="polite">
        {messages.map((m, i) => (
          <li key={i} className={i === messages.length - 1 ? 'log__latest' : undefined}>
            {m}
          </li>
        ))}
      </ul>
    </section>
  )
}
