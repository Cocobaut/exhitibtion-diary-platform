import React, { useState } from 'react';
import { TopNav } from '../../components/layout/TopNav';
import { WORKS, MY_WORKS } from '../../data/mockData';
import { ArtworkCard } from './ArtworkCard';
import { ArtworkDetailModal } from './ArtworkDetailModal';
import { SubmitArtworkModal } from './SubmitArtworkModal';
import { ConfirmSubmitModal } from './ConfirmSubmitModal';
import { ArtworkPreparedModal } from './ArtworkPreparedModal';

export function Room1Page({ onOpenNotifications, onOpenThemeModal }) {
  const [filter, setFilter] = useState('all'); // 'all', 'mine', 'most_sympathy'
  const [search, setSearch] = useState('');
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPreparedModal, setShowPreparedModal] = useState(false);
  const [tempSubmission, setTempSubmission] = useState(null);

  const displayedWorks = filter === 'mine' ? MY_WORKS : WORKS;

  const filteredWorks = displayedWorks.filter((w) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      (w.t && w.t.toLowerCase().includes(term)) ||
      (w.s && w.s.toLowerCase().includes(term)) ||
      (w.a && w.a.toLowerCase().includes(term))
    );
  });

  const handleStartSubmit = (formData) => {
    setTempSubmission(formData);
    setShowSubmitModal(false);
    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = () => {
    setShowConfirmModal(false);
    setShowPreparedModal(true);
  };

  return (
    <div className="stage">
      {/* Top Header */}
      <TopNav
        roomNo="01"
        roomName="Triển lãm Đổ vỡ"
        searchPlaceholder="Tìm theo tiêu đề, câu chuyện, bút danh…"
        searchValue={search}
        onSearchChange={setSearch}
        onOpenNotifications={onOpenNotifications}
        onOpenThemeModal={onOpenThemeModal}
      />

      {/* Filter Chips & Action */}
      <div className="chips-row">
        <div className="chips">
          <span
            className={`chip glass ${filter === 'all' ? 'on' : ''}`}
            onClick={() => setFilter('all')}
          >
            Tất cả tác phẩm
          </span>
          <span
            className={`chip glass ${filter === 'mine' ? 'on' : ''}`}
            onClick={() => setFilter('mine')}
          >
            Tác phẩm của tôi
          </span>
          <span
            className={`chip glass ${filter === 'most_sympathy' ? 'on' : ''}`}
            onClick={() => setFilter('most_sympathy')}
          >
            Nhiều đồng cảm nhất
          </span>
        </div>

        <button
          type="button"
          className="btn main"
          onClick={() => setShowSubmitModal(true)}
        >
          ✦ Trưng bày tác phẩm
        </button>
      </div>

      {/* Gallery of Works */}
      <div className="gallery">
        {filteredWorks.map((work, idx) => (
          <ArtworkCard
            key={work.id || idx}
            artwork={work}
            index={idx}
            onClick={() => {
              if (work.status !== 'PENDING' && work.status !== 'REJECTED') {
                setSelectedArtwork(work);
              }
            }}
          />
        ))}
      </div>

      {/* Modals */}
      <ArtworkDetailModal
        isOpen={Boolean(selectedArtwork)}
        artwork={selectedArtwork}
        onClose={() => setSelectedArtwork(null)}
      />

      <SubmitArtworkModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onSubmit={handleStartSubmit}
      />

      <ConfirmSubmitModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSubmit}
      />

      <ArtworkPreparedModal
        isOpen={showPreparedModal}
        onClose={() => setShowPreparedModal(false)}
        onViewMyArtworks={() => {
          setShowPreparedModal(false);
          setFilter('mine');
        }}
      />
    </div>
  );
}

export default Room1Page;
