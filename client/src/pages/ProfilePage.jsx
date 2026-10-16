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
        <div className="hero-pill-badge" style={{ marginBottom: '8px' }}>
          <span className="dot" />
          <span>ACCOUNT SETTINGS & PROFILE</span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'var(--text-main)', letterSpacing: '-0.02em' }}>
          My Account Profile
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
          Manage your personal identity, contact details, and academic enrollment information.
        </p>
      </div>

      <div className="studio-window-card" style={{ marginBottom: 0 }}>
        <div className="studio-titlebar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="window-traffic-dots">
              <span className="traffic-dot red" />
              <span className="traffic-dot yellow" />
              <span className="traffic-dot green" />
            </div>
            <span className="studio-breadcrumb">
              Pathwise Studio / <strong>Identity & Credentials</strong> / {user?.email}
            </span>
          </div>
          <span className={`badge-clean ${role === 'teacher' ? 'blue' : 'green'}`}>
            {role === 'teacher' ? 'Faculty Instructor' : 'Enrolled Student'}
          </span>
        </div>

        <div style={{ padding: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '22px', paddingBottom: '16px', borderBottom: '1px solid var(--border)' }}>
            <div className="avatar-circle" style={{ width: '42px', height: '42px', fontSize: '15px', borderRadius: '8px' }}>
              {user?.avatarInitials || user?.name?.[0] || 'U'}
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-main)' }}>{user?.name}</h2>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {user?.email}
              </div>
            </div>
          </div>

          <form onSubmit={handleSave}>
            {saveStatus === 'saved' && (
              <div style={{ padding: '10px 14px', background: 'var(--success-subtle)', borderRadius: '6px', border: '1px solid var(--success-border)', color: '#065F46', fontWeight: '600', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Check size={15} />
                <span>Profile details saved successfully!</span>
              </div>
            )}

            {saveStatus === 'error' && (
              <div style={{ padding: '10px 14px', background: 'var(--danger-subtle)', borderRadius: '6px', border: '1px solid var(--danger-border)', color: '#991B1B', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <AlertCircle size={15} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '5px' }}>
                  Email Address (System Verified)
                </label>
                <input
                  type="text"
                  value={user?.email || ''}
                  disabled
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border)', background: '#F8FAFC', color: 'var(--text-muted)', fontSize: '13px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '5px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px', outline: 'none', background: '#FFFFFF' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '5px' }}>
                  Class / Cohort
                </label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px', outline: 'none', background: '#FFFFFF' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '5px' }}>
                  Roll Number / Employee ID
                </label>
                <input
                  type="text"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px', outline: 'none', background: '#FFFFFF' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '5px' }}>
                Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px', outline: 'none', background: '#FFFFFF' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '5px' }}>
                Bio & Focus Areas
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '13px', outline: 'none', background: '#FFFFFF' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSaving}
              >
                <Save size={14} />
                <span>{isSaving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
