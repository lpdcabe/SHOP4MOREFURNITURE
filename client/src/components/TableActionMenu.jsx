import { useEffect, useRef, useState } from 'react';

export default function TableActionMenu({ mode, onModeChange, actions }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const activeAction = actions.find((a) => a.key === mode);

  return (
    <div className="table-action-toolbar" ref={menuRef}>
      <div className="table-action-dropdown">
        <button
          type="button"
          className={`btn btn-sm ${
            activeAction ? `btn-${activeAction.variant}` : 'btn-outline-secondary'
          } table-action-trigger`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <i className={`${activeAction ? activeAction.icon : 'fas fa-sliders-h'} me-2`} />
          <span>{activeAction ? `${activeAction.label} Mode` : 'Actions'}</span>
          <i className="fas fa-chevron-down ms-2" style={{ fontSize: '10px' }} />
        </button>

        {open && (
          <div className="table-action-menu">
            {actions.map((act) => (
              <button
                key={act.key}
                type="button"
                className={`table-action-item ${mode === act.key ? 'active' : ''}`}
                onClick={() => {
                  onModeChange(mode === act.key ? null : act.key);
                  setOpen(false);
                }}
              >
                <i className={`${act.icon} text-${act.variant} me-2`} />
                <span>{act.label}</span>
              </button>
            ))}
            {mode && (
              <>
                <div className="dropdown-divider my-1" />
                <button
                  type="button"
                  className="table-action-item text-muted"
                  onClick={() => {
                    onModeChange(null);
                    setOpen(false);
                  }}
                >
                  <i className="fas fa-times me-2" />
                  <span>Cancel Mode</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {activeAction && (
        <div className={`table-action-hint table-action-hint-${activeAction.variant}`}>
          <span>Click a row to {activeAction.label.toLowerCase()}</span>
          <button
            type="button"
            className="table-action-clear"
            onClick={() => onModeChange(null)}
            aria-label="Exit action mode"
            title="Exit action mode"
          >
            <i className="fas fa-times" />
          </button>
        </div>
      )}
    </div>
  );
}
