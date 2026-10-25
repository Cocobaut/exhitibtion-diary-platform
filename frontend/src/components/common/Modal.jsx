import React from 'react';
import { Icon } from './Icons';

export function Modal({ isOpen, onClose, children, style = {}, panelClassName = '', scrimStyle = {} }) {
  if (!isOpen) return null;

  return (
    <>
      <div className="scrim" style={scrimStyle} onClick={onClose} />
      <div className={`panel ${panelClassName}`} style={style}>
        {onClose && (
          <span className="x" onClick={onClose} role="button" tabIndex={0}>
            <Icon name="x" size={22} />
          </span>
        )}
        {children}
      </div>
    </>
  );
}

export default Modal;
