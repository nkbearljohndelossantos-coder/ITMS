const request = require('supertest');
const { app } = require('../src/server');
const db = require('../src/config/db');
const backupSecurity = require('../src/modules/enterprise-backup/security/backupSecurity');

describe('Enterprise Backup Module - Phase 1 Integration Tests', () => {

  let tokenString;
  let enrolledDeviceId = 'NKB-TEST-DEV-001';
  let deviceAuthToken;

  beforeAll(async () => {
    // Ensure migrations are run on test DB
    await db.migrate.latest();
  });

  afterAll(async () => {
    await db.destroy();
  });

  test('1. Cryptographic Hash-Chain Audit Logging', async () => {
    const log1 = await backupSecurity.appendAuditLog(db, {
      actorType: 'System',
      actorId: 'test_runner',
      action: 'Test Initial Event',
      result: 'Success',
      correlationId: 'test-corr-1'
    });

    const log2 = await backupSecurity.appendAuditLog(db, {
      actorType: 'System',
      actorId: 'test_runner',
      action: 'Test Chained Event',
      result: 'Success',
      correlationId: 'test-corr-2'
    });

    expect(BigInt(log2.sequenceNumber)).toBe(BigInt(log1.sequenceNumber) + 1n);
    expect(log2.recordHash).toBeDefined();
    expect(log2.recordHash.length).toBe(64);
  });

  test('2. AES-256-GCM Encryption & Decryption', () => {
    const plain = 'NKB_CONFIDENTIAL_BACKUP_PAYLOAD_123';
    const encrypted = backupSecurity.encryptAES256GCM(plain);

    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.iv).toBeDefined();
    expect(encrypted.tag).toBeDefined();

    const decrypted = backupSecurity.decryptAES256GCM(encrypted.ciphertext, encrypted.iv, encrypted.tag);
    expect(decrypted).toBe(plain);
  });

  test('3. Generate Short-Lived One-Time Enrollment Token', async () => {
    const tokenRec = await db('backup_enrollment_tokens').insert({
      token: 'nkb_tok_integration_test_12345',
      expires_at: new Date(Date.now() + 86400000),
      max_uses: 1,
      uses_count: 0,
      is_revoked: false,
      created_at: new Date(),
      updated_at: new Date()
    });
    tokenString = 'nkb_tok_integration_test_12345';
    expect(tokenRec).toBeDefined();
  });

  test('4. Agent One-Time Enrollment Workflow', async () => {
    const enrollPayload = {
      enrollmentToken: tokenString,
      deviceId: enrolledDeviceId,
      deviceName: 'TEST-WORKSTATION-01',
      hostname: 'WORKSTATION-01',
      agentVersion: '1.0.0',
      publicKeyPem: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu\n-----END PUBLIC KEY-----'
    };

    const res = await request(app)
      .post('/api/v1/backups/agents/enroll')
      .send(enrollPayload);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.deviceId).toBe(enrolledDeviceId);
    expect(res.body.data.deviceAuthCredentialToken).toBeDefined();

    deviceAuthToken = res.body.data.deviceAuthCredentialToken;
  });

  test('5. Replay Enrollment Token Rejection', async () => {
    const enrollPayload = {
      enrollmentToken: tokenString,
      deviceId: 'NKB-TEST-DEV-002',
      deviceName: 'TEST-WORKSTATION-02',
      hostname: 'WORKSTATION-02',
      agentVersion: '1.0.0',
      publicKeyPem: '-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu\n-----END PUBLIC KEY-----'
    };

    const res = await request(app)
      .post('/api/v1/backups/agents/enroll')
      .send(enrollPayload);

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

});
