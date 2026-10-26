import React from 'react';
import { Icon } from './Icons';

export function Modal({ isOpen, onClose, children, style = {}, panelClassName = '', scrimStyle = {} }) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="scrim"
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 999,
          ...scrimStyle,
        }}
        onClick={onClose}
      />
      <div
        className={`panel ${panelClassName}`}
        style={{
          position: 'fixed',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 1000,
          ...style,
        }}
      >
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
