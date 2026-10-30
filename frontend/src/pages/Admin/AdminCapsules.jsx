import React, { useState, useEffect, useCallback } from 'react';
import { Icon } from '../../components/common/Icons';
import { adminCapsuleService } from '../../services/adminCapsuleService';
import { useLanguage } from '../../context/LanguageContext';

export function AdminCapsules({ triggerToast, onCapsulesUpdated }) {
  const { t, language, localize } = useLanguage();
  const [capsules, setCapsules] = useState([]);
  const [categoriesSummary, setCategoriesSummary] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [filterCategory, setFilterCategory] = useState('ALL'); // ALL, HEALING, COURAGE, PERSPECTIVE
  const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, ACTIVE, INACTIVE

  // Form: Create new capsule
  const [selectedTopic, setSelectedTopic] = useState('PERSPECTIVE');
  const [newContentVi, setNewContentVi] = useState('');
  const [newContentEn, setNewContentEn] = useState('');
  const [showEnglishField, setShowEnglishField] = useState(false);
  const [activeImmediately, setActiveImmediately] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  // Modal: Edit capsule
  const [editingCapsule, setEditingCapsule] = useState(null);
  const [editContentVi, setEditContentVi] = useState('');
  const [editContentEn, setEditContentEn] = useState('');
  const [editCategory, setEditCategory] = useState('HEALING');
  const [isUpdating, setIsUpdating] = useState(false);

  // Categories mapping
  const categoryMap = {
    COURAGE: { label: language === 'en' ? 'Courage' : 'Can đảm', badgeClass: 'b-wait', color: '#B57424' },
    HEALING: { label: language === 'en' ? 'Healing' : 'Chữa lành', badgeClass: 'b-ok', color: '#2D7D46' },
    PERSPECTIVE: { label: language === 'en' ? 'Perspective' : 'Góc nhìn', badgeClass: 'b-priv', color: '#5B4EB5' },
  };

  // -------------------------------------------------------------
  // Load Capsules and Category Stats
  // -------------------------------------------------------------
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const isApprovedParam =
        filterStatus === 'ACTIVE' ? true : filterStatus === 'INACTIVE' ? false : null;
      const categoryParam = filterCategory === 'ALL' ? null : filterCategory;

      const [listRes, catRes] = await Promise.allSettled([
        adminCapsuleService.listCapsules({
          category: categoryParam,
          is_approved: isApprovedParam,
          limit: 100,
        }),
        adminCapsuleService.getCapsuleCategories(),
      ]);

      if (listRes.status === 'fulfilled' && listRes.value) {
        const data = listRes.value?.data || listRes.value;
        const items = data?.items || [];
        setCapsules(items);
        setTotalCount(data?.pagination?.total_items ?? items.length);
      }

      if (catRes.status === 'fulfilled' && catRes.value) {
        const catData = catRes.value?.data || catRes.value;
        setCategoriesSummary(catData?.categories || []);
        if (catData?.total_capsules !== undefined) {
          if (onCapsulesUpdated) {
            onCapsulesUpdated(catData.total_capsules);
          }
        }
      }
    } catch (err) {
      console.warn('Could not load capsules data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filterCategory, filterStatus, onCapsulesUpdated]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // -------------------------------------------------------------
  // Toggle Status
  // -------------------------------------------------------------
  const handleToggleActive = async (capsule) => {
    const newStatus = !capsule.is_approved;

    // Optimistic UI update
    setCapsules((prev) =>
      prev.map((c) => (c.id === capsule.id ? { ...c, is_approved: newStatus } : c))
    );

    try {
      await adminCapsuleService.toggleCapsuleStatus(capsule.id, newStatus);
      if (triggerToast) {
        triggerToast(
          newStatus
            ? `✦ Đã bật thông điệp #${capsule.id}. Thông điệp sẽ có thể được rút ở Sảnh chính.`
            : `Đã tắt thông điệp #${capsule.id}. Máy nhả sẽ tạm thời không bốc trúng thông điệp này.`
        );
      }
      // Refresh summary counts
      adminCapsuleService.getCapsuleCategories().then((res) => {
        const catData = res?.data || res;
        if (catData?.categories) setCategoriesSummary(catData.categories);
      });
    } catch (err) {
      console.error('Error toggling capsule status:', err);
      // Revert optimistic update
      setCapsules((prev) =>
        prev.map((c) => (c.id === capsule.id ? { ...c, is_approved: !newStatus } : c))
      );
      alert('Không thể cập nhật trạng thái thông điệp lúc này.');
    }
  };

  // -------------------------------------------------------------
  // Create New Capsule
  // -------------------------------------------------------------
  const handleAddCapsule = async () => {
    if (!newContentVi.trim()) {
      alert('Vui lòng nhập nội dung thông điệp.');
      return;
    }

    setIsCreating(true);
    try {
      const res = await adminCapsuleService.createCapsule({
        message: newContentVi.trim(),
        message_vi: newContentVi.trim(),
        message_en: newContentEn.trim() || newContentVi.trim(),
        category: selectedTopic,
        is_approved: activeImmediately,
      });

      const createdItem = res?.data || res;
      if (createdItem) {
        setCapsules((prev) => [createdItem, ...prev]);
        setTotalCount((prev) => prev + 1);
      }

      setNewContentVi('');
      setNewContentEn('');
      setShowEnglishField(false);

      if (triggerToast) {
        triggerToast('✦ Thông điệp mới đã được lưu vào kho hòm thư thành công!');
      }

      loadData();
    } catch (err) {
      console.error('Error adding capsule:', err);
      const msg = err?.response?.data?.message || err?.message || 'Không thể lưu thông điệp.';
      alert(`Lỗi: ${msg}`);
    } finally {
      setIsCreating(false);
    }
  };

  // -------------------------------------------------------------
  // Delete Capsule
  // -------------------------------------------------------------
  const handleDeleteCapsule = async (capsule) => {
    if (capsule.draw_count > 0) {
      const proceed = window.confirm(
        `Thông điệp này đã có ${capsule.draw_count} lượt người dùng rút trúng. Bạn có chắc chắn muốn xóa không? (Gợi ý: bạn nên dùng tính năng Tắt thay vì xóa).`
      );
      if (!proceed) return;
    } else {
      if (!window.confirm(`Bạn có chắc muốn xóa thông điệp #${capsule.id} khỏi kho dữ liệu?`)) {
        return;
      }
    }

    try {
      await adminCapsuleService.deleteCapsule(capsule.id);
      setCapsules((prev) => prev.filter((c) => c.id !== capsule.id));
      setTotalCount((prev) => Math.max(0, prev - 1));

      if (triggerToast) {
        triggerToast(`Đã xóa vĩnh viễn thông điệp #${capsule.id} khỏi kho dữ liệu.`);
      }

      loadData();
    } catch (err) {
      console.error('Error deleting capsule:', err);
      const msg = err?.response?.data?.message || err?.message || 'Không thể xóa thông điệp.';
      alert(`Lỗi xóa: ${msg}`);
    }
  };

  // -------------------------------------------------------------
  // Edit Modal Setup
  // -------------------------------------------------------------
  const handleOpenEdit = (capsule) => {
    setEditingCapsule(capsule);
    setEditContentVi(capsule.message_vi || capsule.message || '');
    setEditContentEn(capsule.message_en || '');
    setEditCategory(capsule.category || 'HEALING');
  };

  const handleSaveEdit = async () => {
    if (!editingCapsule || !editContentVi.trim()) return;

    setIsUpdating(true);
    try {
      const res = await adminCapsuleService.updateCapsule(editingCapsule.id, {
        message: editContentVi.trim(),
        message_vi: editContentVi.trim(),
        message_en: editContentEn.trim() || editContentVi.trim(),
        category: editCategory,
      });

      const updatedData = res?.data || res;
      setCapsules((prev) =>
        prev.map((c) =>
          c.id === editingCapsule.id
            ? {
                ...c,
                message: editContentVi.trim(),
                message_vi: editContentVi.trim(),
                message_en: editContentEn.trim() || editContentVi.trim(),
                category: editCategory,
                updated_at: updatedData?.updated_at || new Date().toISOString(),
              }
            : c
        )
      );

      if (triggerToast) {
        triggerToast(`✦ Đã cập nhật thành công thông điệp #${editingCapsule.id}.`);
      }

      setEditingCapsule(null);
      loadData();
    } catch (err) {
      console.error('Error updating capsule:', err);
      const msg = err?.response?.data?.message || err?.message || 'Không thể cập nhật thông điệp.';
      alert(`Lỗi cập nhật: ${msg}`);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      {/* Category Summary Header Badges */}
      <div
        className="abs"
        style={{
          left: '32px',
          right: '420px',
          top: '142px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <span className="muted" style={{ fontSize: '13px', fontWeight: 600, letterSpacing: '.05em' }}>
          TỔNG SỐ: {totalCount} THÔNG ĐIỆP
        </span>

        {categoriesSummary.map((cat) => {
          const meta = categoryMap[cat.category] || { label: cat.label || cat.category, color: '#666' };
          return (
            <div
              key={cat.category}
              style={{
                background: 'var(--paper)',
                border: '1px solid var(--line)',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: meta.color,
                }}
              />
              <b>{meta.label}:</b>
              <span>{cat.total_count}</span>
              
            </div>
          );
        })}
      </div>

      {/* Main Table Container Box */}
      <div
        className="abs box"
        style={{
          left: '32px',
          right: '420px',
          top: '194px',
          bottom: '26px',
          overflowY: 'auto',
          padding: '16px',
        }}
      >
        {/* Table Filter Controls */}
        <div className="row between" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div className="row" style={{ gap: '8px', alignItems: 'center' }}>
            <span className="muted" style={{ fontSize: '13px' }}>Chủ đề:</span>
            <select
              className="inp"
              style={{ width: '150px', padding: '6px 10px', fontSize: '13px' }}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="ALL">Tất cả chủ đề</option>
              <option value="COURAGE">Can đảm</option>
              <option value="HEALING">Chữa lành</option>
              <option value="PERSPECTIVE">Góc nhìn</option>
            </select>

            <span className="muted" style={{ fontSize: '13px', marginLeft: '6px' }}>Trạng thái:</span>
            <select
              className="inp"
              style={{ width: '140px', padding: '6px 10px', fontSize: '13px' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">Tất cả</option>
              <option value="ACTIVE">Đang bật (Active)</option>
              <option value="INACTIVE">Đang tắt (Tạm dừng)</option>
            </select>
          </div>

          {isLoading && <span className="muted" style={{ fontSize: '12.5px' }}>Đang tải dữ liệu...</span>}
        </div>

        {/* Table of Capsules */}
        <table className="at">
          <thead>
            <tr>
              <th style={{ width: '45px' }}>#</th>
              <th>Nội dung thông điệp</th>
              <th style={{ width: '110px' }}>Chủ đề</th>
              <th style={{ width: '130px' }}>Nguồn tạo</th>
              <th style={{ width: '85px', textAlign: 'center' }}>Lượt rút</th>
              <th style={{ width: '65px', textAlign: 'center' }}>Bật/Tắt</th>
              <th style={{ width: '85px', textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {capsules.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                  Không tìm thấy thông điệp nào phù hợp với bộ lọc
                </td>
              </tr>
            ) : (
              capsules.map((c) => {
                const catMeta = categoryMap[c.category] || {
                  label: c.category,
                  badgeClass: 'b-priv',
                };
                const authorDisplay =
                  c.author?.nickname || (c.author_role === 'ADMIN' ? 'Ban Quản trị' : 'Hệ thống');

                return (
                  <tr key={c.id}>
                    <td className="muted" style={{ fontSize: '12px' }}>{c.id}</td>
                    <td style={{ maxWidth: '340px' }}>
                      <div style={{ lineHeight: 1.5, fontSize: '14px' }}>
                        {c.message_vi || c.message}
                      </div>
                      {c.message_en && c.message_en !== (c.message_vi || c.message) && (
                        <small className="muted" style={{ display: 'block', marginTop: '3px', fontStyle: 'italic' }}>
                          EN: {c.message_en}
                        </small>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${catMeta.badgeClass}`}>
                        {catMeta.label}
                      </span>
                    </td>
                    <td className="muted" style={{ fontSize: '13px' }}>
                      {authorDisplay}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge b-blue" style={{ fontSize: '12px' }}>
                        {c.draw_count ?? 0}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span
                        className={`tog ${c.is_approved ? 'on' : ''}`}
                        title={c.is_approved ? 'Đang bật (Nhấp để tắt)' : 'Đang tắt (Nhấp để bật)'}
                        onClick={() => handleToggleActive(c)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="row" style={{ gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="iconbtn"
                          title="Chỉnh sửa câu chữ"
                          onClick={() => handleOpenEdit(c)}
                          style={{ width: '28px', height: '28px', border: '1px solid var(--line)', background: 'var(--paper)' }}
                        >
                          <Icon name="edit" size={14} />
                        </button>
                        <button
                          type="button"
                          className="iconbtn danger"
                          title="Xóa thông điệp"
                          onClick={() => handleDeleteCapsule(c)}
                          style={{ width: '28px', height: '28px', border: '1px solid var(--line)', background: 'var(--paper)' }}
                        >
                          <Icon name="x" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Right Column: Add New Capsule Panel */}
      <div
        className="abs box"
        style={{
          right: '32px',
          width: '368px',
          top: '194px',
          padding: '22px',
        }}
      >
        <b className="serif" style={{ fontSize: '22px', display: 'block', marginBottom: '12px' }}>
          Thêm thông điệp
        </b>

        <div className="fieldl">Chủ đề hòm thư</div>
        <div className="row" style={{ gap: '6px', marginBottom: '14px' }}>
          {[
            { id: 'COURAGE', name: 'Can đảm' },
            { id: 'HEALING', name: 'Chữa lành' },
            { id: 'PERSPECTIVE', name: 'Góc nhìn' },
          ].map((t) => (
            <span
              key={t.id}
              className={`ichip ${selectedTopic === t.id ? 'on' : ''}`}
              onClick={() => setSelectedTopic(t.id)}
              style={{ cursor: 'pointer' }}
            >
              {t.name}
            </span>
          ))}
        </div>

        <div className="fieldl">Nội dung thông điệp (Tiếng Việt)</div>
        <textarea
          className="inp area"
          style={{ minHeight: '110px', fontSize: '14px', lineHeight: 1.5, fontFamily: 'var(--sans)' }}
          value={newContentVi}
          onChange={(e) => setNewContentVi(e.target.value)}
          placeholder="Nhập thông điệp ý nghĩa gửi tới người ghé thăm..."
        />

        <div style={{ marginTop: '10px', marginBottom: '14px' }}>
          <label
            className="row muted"
            style={{ gap: '8px', cursor: 'pointer', fontSize: '13px' }}
          >
            <input
              type="checkbox"
              checked={showEnglishField}
              onChange={(e) => setShowEnglishField(e.target.checked)}
            />
            <span>Thêm bản dịch tiếng Anh (English)</span>
          </label>
        </div>

        {showEnglishField && (
          <div style={{ marginBottom: '14px' }}>
            <div className="fieldl">English Message</div>
            <textarea
              className="inp area"
              style={{ minHeight: '80px', fontSize: '13.5px', fontFamily: 'var(--sans)' }}
              value={newContentEn}
              onChange={(e) => setNewContentEn(e.target.value)}
              placeholder="English translation..."
            />
          </div>
        )}

        <div className="row between" style={{ marginTop: '16px', alignItems: 'center' }}>
          <span
            className="row muted"
            style={{ gap: '8px', cursor: 'pointer', fontSize: '13.5px' }}
            onClick={() => setActiveImmediately(!activeImmediately)}
          >
            <span className={`tog ${activeImmediately ? 'on' : ''}`} /> Bật ngay
          </span>
          <button
            type="button"
            className="btn main sm"
            onClick={handleAddCapsule}
            disabled={isCreating || !newContentVi.trim()}
          >
            {isCreating ? 'Đang lưu...' : 'Lưu vào kho'}
          </button>
        </div>
      </div>

      {/* EDIT CAPSULE MODAL */}
      {editingCapsule && (
        <>
          <div className="scrim" onClick={() => setEditingCapsule(null)} />
          <div className="panel" style={{ width: '560px', boxShadow: '0 25px 70px rgba(0,0,0,0.5)' }}>
            <span className="x" onClick={() => setEditingCapsule(null)} role="button" tabIndex={0}>
              <Icon name="x" size={22} />
            </span>

            <h2 style={{ fontSize: '24px' }}>Chỉnh sửa thông điệp #{editingCapsule.id}</h2>
            <div className="sub">
              Cập nhật lại câu từ cho trau chuốt hơn trước khi đưa tới người rút hòm thư.
            </div>

            <div className="fieldl">Chủ đề</div>
            <div className="row" style={{ gap: '6px', marginBottom: '14px' }}>
              {[
                { id: 'COURAGE', name: 'Can đảm' },
                { id: 'HEALING', name: 'Chữa lành' },
                { id: 'PERSPECTIVE', name: 'Góc nhìn' },
              ].map((t) => (
                <span
                  key={t.id}
                  className={`ichip ${editCategory === t.id ? 'on' : ''}`}
                  onClick={() => setEditCategory(t.id)}
                  style={{ cursor: 'pointer' }}
                >
                  {t.name}
                </span>
              ))}
            </div>

            <div className="fieldl">Nội dung Tiếng Việt</div>
            <textarea
              className="inp area"
              style={{ minHeight: '100px', fontSize: '14px', fontFamily: 'var(--sans)' }}
              value={editContentVi}
              onChange={(e) => setEditContentVi(e.target.value)}
            />

            <div className="fieldl" style={{ marginTop: '12px' }}>Nội dung Tiếng Anh (English)</div>
            <textarea
              className="inp area"
              style={{ minHeight: '80px', fontSize: '13.5px', fontFamily: 'var(--sans)' }}
              value={editContentEn}
              onChange={(e) => setEditContentEn(e.target.value)}
            />

            <div className="row" style={{ justifyContent: 'flex-end', marginTop: '22px', gap: '10px' }}>
              <button
                type="button"
                className="btn ghost"
                onClick={() => setEditingCapsule(null)}
                disabled={isUpdating}
              >
                Hủy
              </button>
              <button
                type="button"
                className="btn main"
                onClick={handleSaveEdit}
                disabled={isUpdating || !editContentVi.trim()}
              >
                {isUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default AdminCapsules;
