import React, { useState } from 'react';
import { User, Shield, Check, AlertCircle, Save } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export function ProfilePage() {
  const { user, role, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [className, setClassName] = useState(user?.className || '');
  const [rollNo, setRollNo] = useState(user?.rollNo || '');
  const [phone, setPhone] = useState(user?.phone || '');

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);
    setErrorMessage('');

    try {
      await updateProfile({
        name,
        bio,
        className,
        rollNo,
        phone,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus('error');
      setErrorMessage(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
      <div>
        <h1 style={{ fontSize: '24px', fontWeight: '800' }}>My Account Profile</h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>
          Manage your personal identity, contact details, and academic enrollment information.
        </p>
      </div>

      <div className="studdy-card" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="avatar-circle" style={{ width: '44px', height: '44px', fontSize: '16px' }}>
              {user?.avatarInitials || user?.name?.[0] || 'U'}
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700' }}>{user?.name}</h2>
              <span className={`role-badge ${role === 'teacher' ? 'teacher' : 'student'}`}>
                {role === 'teacher' ? 'Faculty Instructor' : 'Enrolled Student'}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave}>
          {saveStatus === 'saved' && (
            <div style={{ padding: '12px 16px', background: 'var(--success-subtle)', borderRadius: '12px', border: '1px solid #A7F3D0', color: 'var(--success)', fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Check size={16} />
              <span>Profile details saved successfully!</span>
            </div>
          )}

          {saveStatus === 'error' && (
            <div style={{ padding: '12px 16px', background: 'var(--danger-subtle)', borderRadius: '12px', border: '1px solid #FECACA', color: 'var(--danger)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '5px' }}>
                Email Address (Read-only)
              </label>
              <input
                type="text"
                value={user?.email || ''}
                disabled
                style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface-muted)', color: 'var(--text-muted)', fontSize: '13.5px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '5px' }}>
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '13.5px', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '5px' }}>
                Class / Cohort
              </label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '13.5px', outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '5px' }}>
                Roll Number / Employee ID
              </label>
              <input
                type="text"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '13.5px', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '5px' }}>
              Phone Number
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '13.5px', outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '5px' }}>
              Bio & Focus Areas
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '13.5px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="submit"
              className="btn-studdy btn-studdy-primary"
              disabled={isSaving}
            >
              <Save size={15} />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfilePage;
