import React, { useState } from 'react';
import { TopNav } from '../../components/layout/TopNav';
import { CATS, CAT_KEYS } from '../../data/mockData';
import { WishTree } from './WishTree';
import { ReadLeafModal } from './ReadLeafModal';
import { HangLeafModal } from './HangLeafModal';

export function Room3Page({ onOpenNotifications, onOpenThemeModal }) {
  const [filterCategory, setFilterCategory] = useState(null); // null = all
  const [search, setSearch] = useState('');
  const [selectedLeaf, setSelectedLeaf] = useState({ x: 760, y: 330, catKey: 'CL' });
  const [showReadModal, setShowReadModal] = useState(false);
  const [showHangModal, setShowHangModal] = useState(false);

  return (
    <div className="stage">
      <WishTree
        filterCategory={filterCategory}
        selectedLeaf={selectedLeaf}
        onSelectLeaf={(leaf) => {
          setSelectedLeaf(leaf);
        }}
      />

      {/* Top Header */}
      <TopNav
        roomNo="03"
        roomName="Cây Thông điệp"
        searchPlaceholder="Tìm lời động viên…"
        searchValue={search}
        onSearchChange={setSearch}
        onOpenNotifications={onOpenNotifications}
        onOpenThemeModal={onOpenThemeModal}
      />

      {/* Filter Chips & Action */}
      <div className="chips-row">
        <div className="chips">
          <span
            className={`chip glass ${!filterCategory ? 'on' : ''}`}
            onClick={() => setFilterCategory(null)}
          >
            Tất cả
          </span>
          {CAT_KEYS.map((k) => (
            <span
              key={k}
              className={`chip glass ${filterCategory === k ? 'on' : ''}`}
              onClick={() => setFilterCategory(k)}
            >
              <i className="dot" style={{ background: CATS[k].c }} />
              {CATS[k].name}
            </span>
          ))}
          <span className="chip glass">Của tôi</span>
        </div>

        <button
          type="button"
          className="btn main"
          onClick={() => setShowHangModal(true)}
        >
          ✦ Treo thông điệp
        </button>
      </div>

      {/* Floating Hover Leaf Tooltip */}
      {selectedLeaf && (
        <div
          className="abs"
          onClick={() => setShowReadModal(true)}
          style={{
            left: '822px',
            top: '290px',
            zIndex: 7,
            background: 'var(--paper)',
            color: 'var(--ink)',
            borderRadius: '12px',
            padding: '8px 14px',
            boxShadow: '0 14px 30px rgba(0,0,0,.35)',
            whiteSpace: 'nowrap',
            cursor: 'pointer',
          }}
        >
          <div className="row" style={{ gap: '6px', fontSize: '12.5px', color: '#4E7A4A' }}>
            <i className="dot" style={{ background: '#94C590' }} />
            Chữa lành
          </div>
          <b className="serif" style={{ fontSize: '19px' }}>
            Gửi bạn đang mệt mỏi
          </b>
          <div className="muted" style={{ fontSize: '12.5px' }}>
            Mây · nhấn để đọc
          </div>
        </div>
      )}

      {/* Footer Counter */}
      <div className="counter">
        862 lời động viên đang treo trên cây · rê chuột vào một chiếc lá để xem, nhấn để đọc
      </div>

      {/* Modals */}
      <ReadLeafModal
        isOpen={showReadModal}
        onClose={() => setShowReadModal(false)}
      />

      <HangLeafModal
        isOpen={showHangModal}
        onClose={() => setShowHangModal(false)}
        onHangLeaf={(data) => {
          console.log('Hanging leaf:', data);
        }}
      />
    </div>
  );
}

export default Room3Page;
