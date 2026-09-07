interface Props {
  message: string;
}

// A brief, non-modal confirmation for actions taken inside the manager
// window (create/delete/save/settings) — the "always show status" rule
// applies here too, not just to script *runs* (those get a system
// notification via notifyRunResult instead, since palette/hotkey/trigger
// runs have no visible window to show a toast in).
export default function Toast({ message }: Props) {
  return (
    <div className="toast-host">
      <div className="toast">{message}</div>
    </div>
  );
}
