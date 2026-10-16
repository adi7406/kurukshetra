import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Shield, Check, AlertCircle, Save } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import Chip from '../components/common/Chip';
import { useToast } from '../context/ToastContext';

export function ProfilePage() {
  const navigate = useNavigate();
  const toast = useToast();
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
      toast.success('Profile details saved successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus('error');
      setErrorMessage(err.message || 'Failed to update profile.');
      toast.error('Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'PW';

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          <span style={{ cursor: 'pointer' }} onClick={() => navigate('/home')}>Home</span>
          <span>/</span>
          <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>Profile</span>
        </div>
        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--coral)', letterSpacing: '0.04em' }}>
          Account & Credentials
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '-0.01em', margin: '4px 0 0 0' }}>
          My Account Profile
        </h1>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginTop: '4px', margin: 0 }}>
          Manage your personal identity, contact details, and academic enrollment information.
        </p>
      </div>

      <div
        style={{
          background: 'var(--surface)',
          borderRadius: '20px',
          border: '1px solid var(--border-hairline)',
          boxShadow: 'var(--shadow-card)',
          padding: '28px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid var(--border-hairline)', marginBottom: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                background: 'var(--coral-soft)',
                color: 'var(--coral)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '16px',
              }}
            >
              {userInitials}
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                {user?.name || 'User Profile'}
              </h2>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                {user?.email}
              </div>
            </div>
          </div>

          <Chip variant={role === 'teacher' ? 'default' : 'success'} size="sm">
            {role === 'teacher' ? 'Faculty Instructor' : 'Enrolled Student'}
          </Chip>
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {saveStatus === 'saved' && (
            <div style={{ padding: '10px 14px', background: 'var(--mastery-solid-soft)', borderRadius: '12px', border: '1px solid var(--success-border)', color: 'var(--mastery-solid)', fontWeight: 600, fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Check size={14} strokeWidth={2} />
              <span>Profile details saved successfully!</span>
            </div>
          )}

          {saveStatus === 'error' && (
            <div style={{ padding: '10px 14px', background: 'var(--mastery-weak-soft)', borderRadius: '12px', border: '1px solid var(--danger-border)', color: 'var(--mastery-weak)', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={14} strokeWidth={1.5} />
              <span>{errorMessage}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Email Address (Verified)
              </label>
              <input
                type="text"
                value={user?.email || ''}
                disabled
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-hairline)',
                  background: 'var(--surface-muted)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-hairline)',
                  fontSize: '13px',
                  outline: 'none',
                  background: 'var(--surface)',
                  color: 'var(--text-main)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                Class / Cohort
              </label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-hairline)',
                  fontSize: '13px',
                  outline: 'none',
                  background: 'var(--surface)',
                  color: 'var(--text-main)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
                Roll Number
              </label>
              <input
                type="text"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-hairline)',
                  fontSize: '13px',
                  outline: 'none',
                  background: 'var(--surface)',
                  color: 'var(--text-main)',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
              Contact Phone
            </label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 12px',
                borderRadius: '12px',
                border: '1px solid var(--border-hairline)',
                fontSize: '13px',
                outline: 'none',
                background: 'var(--surface)',
                color: 'var(--text-main)',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
              Academic Bio & Learning Goals
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell instructors about your focus areas (e.g., preparing for competitive programming and mastering graph algorithms)..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '12px',
                border: '1px solid var(--border-hairline)',
                fontSize: '13px',
                outline: 'none',
                background: 'var(--surface)',
                color: 'var(--text-main)',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button
              type="submit"
              className="btn-coral-pill"
              disabled={isSaving}
            >
              <Save size={14} strokeWidth={1.5} />
              <span>{isSaving ? 'Saving Changes...' : 'Save Profile'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProfilePage;
