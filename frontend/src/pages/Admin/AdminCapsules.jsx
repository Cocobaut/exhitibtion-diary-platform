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
  const L = (vi, en) => (language === 'en' ? en : vi);

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
            ? L(`✦ Đã bật thông điệp #${capsule.id}. Người dùng có thể rút được thông điệp này.`, `✦ Message #${capsule.id} is on. Visitors can now draw it.`)
            : L(`Đã tắt thông điệp #${capsule.id}. Người dùng sẽ không rút được thông điệp này.`, `Message #${capsule.id} is off. Visitors will not draw it.`)
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
      alert(L('Không thể cập nhật trạng thái thông điệp lúc này.', 'Could not update this message right now.'));
    }
  };

  // -------------------------------------------------------------
  // Create New Capsule
  // -------------------------------------------------------------
  const handleAddCapsule = async () => {
    if (!newContentVi.trim()) {
      alert(L('Vui lòng nhập nội dung thông điệp.', 'Please enter the message.'));
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
        triggerToast(L('✦ Đã lưu thông điệp mới vào kho.', '✦ New message saved.'));
      }

      loadData();
    } catch (err) {
      console.error('Error adding capsule:', err);
      const msg = err?.response?.data?.message || err?.message || L('Không thể lưu thông điệp.', 'Could not save the message.');
      alert(msg);
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
        L(
          `Thông điệp này đã được rút ${capsule.draw_count} lần. Bạn vẫn muốn xóa? Bạn cũng có thể chỉ tắt nó đi.`,
          `This message has been drawn ${capsule.draw_count} times. Delete it anyway? You can also just turn it off.`
        )
      );
      if (!proceed) return;
    } else {
      if (!window.confirm(L(`Xóa thông điệp #${capsule.id}?`, `Delete message #${capsule.id}?`))) {
        return;
      }
    }

    try {
      await adminCapsuleService.deleteCapsule(capsule.id);
      setCapsules((prev) => prev.filter((c) => c.id !== capsule.id));
      setTotalCount((prev) => Math.max(0, prev - 1));

      if (triggerToast) {
        triggerToast(L(`Đã xóa thông điệp #${capsule.id}.`, `Message #${capsule.id} deleted.`));
      }

      loadData();
    } catch (err) {
      console.error('Error deleting capsule:', err);
      const msg = err?.response?.data?.message || err?.message || L('Không thể xóa thông điệp.', 'Could not delete the message.');
      alert(msg);
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
        triggerToast(L(`✦ Đã cập nhật thông điệp #${editingCapsule.id}.`, `✦ Message #${editingCapsule.id} updated.`));
      }

      setEditingCapsule(null);
      loadData();
    } catch (err) {
      console.error('Error updating capsule:', err);
      const msg = err?.response?.data?.message || err?.message || L('Không thể cập nhật thông điệp.', 'Could not update the message.');
      alert(msg);
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
          {L(`TỔNG SỐ: ${totalCount} THÔNG ĐIỆP`, `TOTAL: ${totalCount} MESSAGES`)}
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
            <span className="muted" style={{ fontSize: '13px' }}>{L('Chủ đề:', 'Topic:')}</span>
            <select
              className="inp"
              style={{ width: '150px', padding: '6px 10px', fontSize: '13px' }}
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="ALL">{L('Tất cả chủ đề', 'All topics')}</option>
              <option value="COURAGE">{categoryMap.COURAGE.label}</option>
              <option value="HEALING">{categoryMap.HEALING.label}</option>
              <option value="PERSPECTIVE">{categoryMap.PERSPECTIVE.label}</option>
            </select>

            <span className="muted" style={{ fontSize: '13px', marginLeft: '6px' }}>{L('Trạng thái:', 'Status:')}</span>
            <select
              className="inp"
              style={{ width: '140px', padding: '6px 10px', fontSize: '13px' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="ALL">{L('Tất cả', 'All')}</option>
              <option value="ACTIVE">{L('Đang bật', 'On')}</option>
              <option value="INACTIVE">{L('Đang tắt', 'Off')}</option>
            </select>
          </div>

          {isLoading && <span className="muted" style={{ fontSize: '12.5px' }}>{L('Đang tải...', 'Loading...')}</span>}
        </div>

        {/* Table of Capsules */}
        <table className="at">
          <thead>
            <tr>
              <th style={{ width: '45px' }}>#</th>
              <th>{L('Nội dung thông điệp', 'Message')}</th>
              <th style={{ width: '110px' }}>{L('Chủ đề', 'Topic')}</th>
              <th style={{ width: '130px' }}>{L('Người tạo', 'Created by')}</th>
              <th style={{ width: '85px', textAlign: 'center' }}>{L('Lượt rút', 'Draws')}</th>
              <th style={{ width: '65px', textAlign: 'center' }}>Bật/Tắt</th>
              <th style={{ width: '85px', textAlign: 'right' }}>{L('Thao tác', 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {capsules.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)' }}>
                  {L('Không có thông điệp nào phù hợp', 'No matching messages')}
                </td>
              </tr>
            ) : (
              capsules.map((c) => {
                const catMeta = categoryMap[c.category] || {
                  label: c.category,
                  badgeClass: 'b-priv',
                };
                const authorDisplay =
                  c.author?.nickname || (c.author_role === 'ADMIN' ? L('Ban Quản trị', 'Admin team') : L('Hệ thống', 'System'));

                return (
                  <tr key={c.id}>
                    <td className="muted" style={{ fontSize: '12px' }}>{c.id}</td>
                    <td style={{ maxWidth: '340px' }}>
                      {(() => {
                        const vi = c.message_vi || c.message;
                        const en = c.message_en && c.message_en !== vi ? c.message_en : null;
                        const main = language === 'en' && en ? en : vi;
                        const other = language === 'en' ? (en ? vi : null) : en;
                        return (
                          <>
                            <div style={{ lineHeight: 1.5, fontSize: '14px' }}>{main}</div>
                            {other && (
                              <small className="muted" style={{ display: 'block', marginTop: '3px', fontStyle: 'italic' }}>
                                {language === 'en' ? 'VI' : 'EN'}: {other}
                              </small>
                            )}
                          </>
                        );
                      })()}
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
                        title={c.is_approved ? L('Đang bật, nhấn để tắt', 'On, click to turn off') : L('Đang tắt, nhấn để bật', 'Off, click to turn on')}
                        onClick={() => handleToggleActive(c)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="row" style={{ gap: '6px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="iconbtn"
                          title={L('Chỉnh sửa', 'Edit')}
                          onClick={() => handleOpenEdit(c)}
                          style={{ width: '28px', height: '28px', border: '1px solid var(--line)', background: 'var(--paper)' }}
                        >
                          <Icon name="edit" size={14} />
                        </button>
                        <button
                          type="button"
                          className="iconbtn danger"
                          title={L('Xóa thông điệp', 'Delete message')}
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
          {L('Thêm thông điệp', 'Add a message')}
        </b>

        <div className="fieldl">{L('Chủ đề', 'Topic')}</div>
        <div className="row" style={{ gap: '6px', marginBottom: '14px' }}>
          {[
            { id: 'COURAGE', name: categoryMap.COURAGE.label },
            { id: 'HEALING', name: categoryMap.HEALING.label },
            { id: 'PERSPECTIVE', name: categoryMap.PERSPECTIVE.label },
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

        <div className="fieldl">{L('Nội dung tiếng Việt', 'Vietnamese message')}</div>
        <textarea
          className="inp area"
          style={{ minHeight: '110px', fontSize: '14px', lineHeight: 1.5, fontFamily: 'var(--sans)' }}
          value={newContentVi}
          onChange={(e) => setNewContentVi(e.target.value)}
          placeholder={L('Một lời nhắn gửi người ghé thăm...', 'A kind word for visitors...')}
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
            <span>{L('Thêm bản dịch tiếng Anh', 'Add an English translation')}</span>
          </label>
        </div>

        {showEnglishField && (
          <div style={{ marginBottom: '14px' }}>
            <div className="fieldl">{L('Nội dung tiếng Anh', 'English message')}</div>
            <textarea
              className="inp area"
              style={{ minHeight: '80px', fontSize: '13.5px', fontFamily: 'var(--sans)' }}
              value={newContentEn}
              onChange={(e) => setNewContentEn(e.target.value)}
              placeholder={L('Bản dịch tiếng Anh...', 'English translation...')}
            />
          </div>
        )}

        <div className="row between" style={{ marginTop: '16px', alignItems: 'center' }}>
          <span
            className="row muted"
            style={{ gap: '8px', cursor: 'pointer', fontSize: '13.5px' }}
            onClick={() => setActiveImmediately(!activeImmediately)}
          >
            <span className={`tog ${activeImmediately ? 'on' : ''}`} /> {L('Bật ngay', 'Turn on now')}
          </span>
          <button
            type="button"
            className="btn main sm"
            onClick={handleAddCapsule}
            disabled={isCreating || !newContentVi.trim()}
          >
            {isCreating ? L('Đang lưu...', 'Saving...') : L('Lưu vào kho', 'Save')}
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

            <h2 style={{ fontSize: '24px' }}>{L('Chỉnh sửa thông điệp', 'Edit message')} #{editingCapsule.id}</h2>
            <div className="sub">
              {L('Chỉnh lại câu chữ trước khi đến tay người rút thư.', 'Polish the wording before visitors draw it.')}
            </div>

            <div className="fieldl">{L('Chủ đề', 'Topic')}</div>
            <div className="row" style={{ gap: '6px', marginBottom: '14px' }}>
              {[
                { id: 'COURAGE', name: categoryMap.COURAGE.label },
                { id: 'HEALING', name: categoryMap.HEALING.label },
                { id: 'PERSPECTIVE', name: categoryMap.PERSPECTIVE.label },
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

            <div className="fieldl">{L('Nội dung tiếng Việt', 'Vietnamese message')}</div>
            <textarea
              className="inp area"
              style={{ minHeight: '100px', fontSize: '14px', fontFamily: 'var(--sans)' }}
              value={editContentVi}
              onChange={(e) => setEditContentVi(e.target.value)}
            />

            <div className="fieldl" style={{ marginTop: '12px' }}>{L('Nội dung tiếng Anh', 'English message')}</div>
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
                {L('Hủy', 'Cancel')}
              </button>
              <button
                type="button"
                className="btn main"
                onClick={handleSaveEdit}
                disabled={isUpdating || !editContentVi.trim()}
              >
                {isUpdating ? L('Đang lưu...', 'Saving...') : L('Lưu thay đổi', 'Save changes')}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default AdminCapsules;
