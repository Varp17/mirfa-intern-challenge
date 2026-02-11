'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Lock, Unlock, Database, RefreshCw, AlertCircle, Clock, ChevronRight } from 'lucide-react';

const API_URL = '/api';

interface TxRecord {
    id: string;
    partyId: string;
    createdAt: string;
    payload_ct: string;
    payload_tag: string;
}

export default function Home() {
    const [partyId, setPartyId] = useState('');
    const [payload, setPayload] = useState('{\n  "amount": 100,\n  "currency": "USD"\n}');
    const [recordId, setRecordId] = useState('');
    const [encryptedRecord, setEncryptedRecord] = useState<TxRecord | null>(null);
    const [decryptedPayload, setDecryptedPayload] = useState<any>(null);
    const [history, setHistory] = useState<TxRecord[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const fetchHistory = async () => {
        try {
            const res = await fetch(`${API_URL}/tx`);
            const data = await res.json();
            if (res.ok) setHistory(data);
        } catch (err) {
            console.error('Failed to fetch history', err);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const handleEncrypt = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            let parsedPayload;
            try {
                parsedPayload = JSON.parse(payload);
            } catch (e) {
                throw new Error('Invalid JSON payload');
            }

            const res = await fetch(`${API_URL}/tx/encrypt`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ partyId, payload: parsedPayload }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to encrypt');

            setEncryptedRecord(data);
            setRecordId(data.id);
            setSuccess('Transaction encrypted and saved successfully!');
            fetchHistory(); // Refresh history
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFetch = async (id?: string) => {
        const tid = id || recordId;
        if (!tid) return setError('Enter a record ID to fetch');
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch(`${API_URL}/tx/${tid}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch');

            setEncryptedRecord(data);
            setRecordId(data.id);
            setDecryptedPayload(null);
            setSuccess('Record fetched successfully!');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDecrypt = async () => {
        if (!recordId) return setError('Enter a record ID to decrypt');
        setLoading(true);
        setError(null);
        setSuccess(null);
        try {
            const res = await fetch(`${API_URL}/tx/${recordId}/decrypt`, {
                method: 'POST',
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to decrypt');

            setDecryptedPayload(data.payload);
            setSuccess('Record decrypted successfully!');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="container">
            <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
                <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
                    <Shield style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} color="#38bdf8" size={48} />
                    SecureTx
                </h1>
                <p style={{ color: '#94a3b8' }}>Production-grade Envelope Encryption Mini App</p>
            </header>

            <div className="main-layout">
                {/* Sidebar: Session History */}
                <aside className="glass-sidebar">
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1.5rem', gap: '0.5rem' }}>
                        <Clock size={20} color="#94a3b8" />
                        <h3 style={{ fontSize: '1.25rem' }}>History</h3>
                    </div>
                    <div className="history-list">
                        {history.length > 0 ? (
                            history.map((record: TxRecord) => (
                                <button
                                    key={record.id}
                                    className={`history-item ${recordId === record.id ? 'active' : ''}`}
                                    onClick={() => handleFetch(record.id)}
                                >
                                    <div style={{ textAlign: 'left' }}>
                                        <div style={{ fontWeight: '600', fontSize: '0.875rem' }}>{record.partyId}</div>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{record.id}</div>
                                    </div>
                                    <ChevronRight size={14} />
                                </button>
                            ))
                        ) : (
                            <p style={{ color: '#64748b', fontSize: '0.875rem', textAlign: 'center', padding: '1rem' }}>No history yet</p>
                        )}
                    </div>
                </aside>

                <div className="grid">
                    {/* Left Side: Creation */}
                    <section className="glass-card">
                        <div className="badge badge-blue">New Transaction</div>
                        <h2 style={{ marginBottom: '1.5rem' }}>Encrypt Payload</h2>
                        <div className="input-group">
                            <label className="label">Party ID</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="e.g. party_123"
                                value={partyId}
                                onChange={(e) => setPartyId(e.target.value)}
                            />
                        </div>
                        <div className="input-group">
                            <label className="label">JSON Payload</label>
                            <textarea
                                className="textarea"
                                value={payload}
                                onChange={(e) => setPayload(e.target.value)}
                            />
                        </div>
                        <button className="btn btn-primary" onClick={handleEncrypt} disabled={loading} style={{ width: '100%' }}>
                            {loading ? <RefreshCw className="animate-spin" /> : <><Lock size={18} style={{ marginRight: '0.5rem' }} /> Encrypt & Save</>}
                        </button>

                        {error && <div className="error-msg"><AlertCircle size={14} style={{ marginRight: '0.25rem' }} /> {error}</div>}
                        {success && <div className="success-msg">{success}</div>}
                    </section>

                    {/* Right Side: Retrieval & Decryption */}
                    <section className="glass-card">
                        <div className="badge badge-purple">Existing Record</div>
                        <h2 style={{ marginBottom: '1.5rem' }}>Retrieve & Decrypt</h2>
                        <div className="input-group">
                            <label className="label">Record ID</label>
                            <input
                                type="text"
                                className="input"
                                placeholder="Enter record ID"
                                value={recordId}
                                onChange={(e) => setRecordId(e.target.value)}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                            <button className="btn btn-secondary" onClick={() => handleFetch()} disabled={loading} style={{ flex: 1 }}>
                                <Database size={18} style={{ marginRight: '0.5rem' }} /> Fetch
                            </button>
                            <button className="btn btn-primary" onClick={handleDecrypt} disabled={loading} style={{ flex: 1 }}>
                                <Unlock size={18} style={{ marginRight: '0.5rem' }} /> Decrypt
                            </button>
                        </div>

                        <div style={{ wordBreak: 'break-all' }}>
                            <label className="label">Last Record State</label>
                            {encryptedRecord ? (
                                <pre>
                                    {JSON.stringify({
                                        id: encryptedRecord.id,
                                        partyId: encryptedRecord.partyId,
                                        payload_ct: encryptedRecord.payload_ct.substring(0, 20) + '...',
                                        tag: encryptedRecord.payload_tag
                                    }, null, 2)}
                                </pre>
                            ) : (
                                <p style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.875rem' }}>No record loaded</p>
                            )}
                        </div>

                        <div style={{ marginTop: '1.5rem' }}>
                            <label className="label">Decrypted Result</label>
                            {decryptedPayload ? (
                                <pre style={{ borderColor: 'var(--success)' }}>
                                    {JSON.stringify(decryptedPayload, null, 2)}
                                </pre>
                            ) : (
                                <p style={{ color: '#64748b', fontStyle: 'italic', fontSize: '0.875rem' }}>Not decrypted yet</p>
                            )}
                        </div>
                    </section>
                </div>
            </div>

            <footer style={{ marginTop: '4rem', textAlign: 'center', color: '#64748b', fontSize: '0.875rem' }}>
                Built with Next.js & Shared Envelope Encryption
            </footer>
        </main>
    );
}
