import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TopNav } from '../../components/layout/TopNav';
import { ArtworkCard } from './ArtworkCard';
import { ArtworkDetailModal } from './ArtworkDetailModal';
import { SubmitArtworkModal } from './SubmitArtworkModal';
import { ConfirmSubmitModal } from './ConfirmSubmitModal';
import { ArtworkPreparedModal } from './ArtworkPreparedModal';
import { useAuth } from '../../context/AuthContext';
import { room1Service } from '../../services/room1Service';

export function Room1Page({ onOpenNotifications, onOpenThemeModal }) {
  const { isAuthenticated } = useAuth();
  const [filter, setFilter] = useState('all'); // 'all', 'mine', 'most_sympathy'
  const [search, setSearch] = useState('');
  const [artworks, setArtworks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Modals state
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showPreparedModal, setShowPreparedModal] = useState(false);
  const [tempSubmission, setTempSubmission] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const searchDebounceRef = useRef(null);

  // Tải danh sách tác phẩm từ backend
  const fetchArtworks = useCallback(async (currentFilter = filter, currentSearch = search) => {
    setIsLoading(true);
    setErrorMsg('');

    try {
      if (currentSearch && currentSearch.trim().length > 0) {
        // Tìm kiếm có từ khóa
        const scope = currentFilter === 'mine' ? 'mine' : 'all';
        const res = await room1Service.searchArtworks({
          q: currentSearch.trim(),
          scope,
          limit: 30,
        });
        const items = res?.items || (Array.isArray(res) ? res : []);
        setArtworks(items);
      } else {
        // Duyệt theo filter thông thường
        if (currentFilter === 'mine' && !isAuthenticated) {
          setArtworks([]);
          setIsLoading(false);
          return;
        }

        const res = await room1Service.getArtworks({
          filter: currentFilter,
          limit: 30,
        });
        const items = res?.items || (Array.isArray(res) ? res : []);
        setArtworks(items);
      }
    } catch (err) {
      if (err.errorCode === 'UNAUTHORIZED' || err.status === 401) {
        setErrorMsg('Vui lòng đăng nhập để xem tác phẩm của bạn.');
      } else {
        setErrorMsg(err.message || 'Không thể tải danh sách tác phẩm.');
      }
      setArtworks([]);
    } finally {
      setIsLoading(false);
    }
  }, [filter, search, isAuthenticated]);

  // Gọi khi filter thay đổi
  useEffect(() => {
    fetchArtworks(filter, search);
  }, [filter, fetchArtworks]);

  // Debounce 300ms khi gõ tìm kiếm
  const handleSearchChange = (value) => {
    setSearch(value);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      fetchArtworks(filter, value);
    }, 300);
  };

  // Cập nhật cảm xúc trên thẻ
  const handleSelectReaction = async (artworkId, reactionType) => {
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập để gửi sự đồng cảm đến tác phẩm này.');
      return;
    }

    try {
      const res = await room1Service.toggleReaction(artworkId, reactionType);
      if (res) {
        setArtworks((prev) =>
          prev.map((item) => {
            if (item.id === artworkId) {
              return {
                ...item,
                my_reaction: res.current_reaction,
                user_reaction: res.current_reaction,
                reactions: res.reactions_summary || item.reactions,
                total_reactions: res.reactions_summary?.total ?? item.total_reactions,
              };
            }
            return item;
          })
        );
      }
    } catch (err) {
      console.warn('Lỗi khi thả cảm xúc:', err);
    }
  };

  // Callback khi cập nhật reaction trong modal chi tiết
  const handleReactionUpdated = (artworkId, { my_reaction, reactions }) => {
    setArtworks((prev) =>
      prev.map((item) => {
        if (item.id === artworkId) {
          return {
            ...item,
            my_reaction,
            user_reaction: my_reaction,
            reactions,
            total_reactions: reactions?.total ?? item.total_reactions,
          };
        }
        return item;
      })
    );
  };

  // Bước 1: Khởi động gửi tác phẩm
  const handleStartSubmit = (formData) => {
    if (!isAuthenticated) {
      alert('Vui lòng đăng nhập trước khi trưng bày tác phẩm.');
      return;
    }
    setTempSubmission(formData);
    setShowSubmitModal(false);
    setShowConfirmModal(true);
    setSubmitError('');
  };

  // Bước 2: Xác nhận gửi tác phẩm (POST /api/v1/rooms/1/artworks)
  const handleConfirmSubmit = async () => {
    if (!tempSubmission) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      await room1Service.createArtwork({
        title: tempSubmission.title,
        short_content: tempSubmission.summary,
        content: tempSubmission.story,
        is_anonymous: tempSubmission.isAnonymous,
      });

      setIsSubmitting(false);
      setShowConfirmModal(false);
      setShowPreparedModal(true);
      fetchArtworks(filter, search);
    } catch (err) {
      setIsSubmitting(false);
      setSubmitError(err.message || 'Không thể gửi tác phẩm. Vui lòng thử lại.');
    }
  };

  return (
    <div className="stage">
      {/* Top Header */}
      <TopNav
        roomNo="01"
        roomName="Triển lãm Đổ vỡ"
        searchPlaceholder="Tìm theo tiêu đề, câu chuyện, bút danh…"
        searchValue={search}
        onSearchChange={handleSearchChange}
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
          onClick={() => {
            if (!isAuthenticated) {
              alert('Vui lòng đăng nhập để trưng bày tác phẩm của bạn.');
              return;
            }
            setShowSubmitModal(true);
          }}
        >
          ✦ Trưng bày tác phẩm
        </button>
      </div>

      {/* Gallery of Works */}
      <div className="gallery" style={{ minHeight: '380px' }}>
        {isLoading ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '60px 20px',
              textAlign: 'center',
              color: 'var(--ink2)',
              fontStyle: 'italic',
            }}
          >
            Đang thắp sáng phòng triển lãm...
          </div>
        ) : errorMsg ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '60px 20px',
              textAlign: 'center',
              color: 'var(--acc)',
            }}
          >
            {errorMsg}
          </div>
        ) : filter === 'mine' && !isAuthenticated ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '60px 20px',
              textAlign: 'center',
              color: 'var(--ink2)',
            }}
          >
            <div className="hand" style={{ fontSize: '24px', marginBottom: '6px' }}>
              chốn lưu giữ những nỗi niềm
            </div>
            <div>Vui lòng đăng nhập để xem các tác phẩm bạn đã gửi gắm tại Phòng 1.</div>
          </div>
        ) : artworks.length === 0 ? (
          <div
            style={{
              gridColumn: '1 / -1',
              padding: '60px 20px',
              textAlign: 'center',
              color: 'var(--ink2)',
            }}
          >
            <div className="hand" style={{ fontSize: '24px', marginBottom: '6px' }}>
              chưa có tác phẩm nào phù hợp
            </div>
            <div>Hãy thử đổi bộ lọc hoặc từ khóa tìm kiếm nhé.</div>
          </div>
        ) : (
          artworks.map((work, idx) => (
            <ArtworkCard
              key={work.id || idx}
              artwork={work}
              index={idx}
              onClick={() => {
                if (work.status !== 'PENDING' && work.status !== 'REJECTED') {
                  setSelectedArtwork(work);
                }
              }}
              onSelectReaction={handleSelectReaction}
            />
          ))
        )}
      </div>

      {/* Modals */}
      <ArtworkDetailModal
        isOpen={Boolean(selectedArtwork)}
        artwork={selectedArtwork}
        onClose={() => setSelectedArtwork(null)}
        onReactionUpdated={handleReactionUpdated}
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
        isSubmitting={isSubmitting}
        errorMsg={submitError}
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
