/**
 * End-to-end test script for CancerDx AI
 * Run: node test_e2e.js
 */
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const BACKEND = 'http://localhost:5000';
const ML_URL  = 'http://localhost:8000';
const IMG_PATH = path.join(__dirname, '_test_slide.png');

async function main() {
  console.log('\n🔬 CancerDx AI — End-to-End Test\n' + '='.repeat(50));

  // --- Create a valid test image using Python/PIL ---
  try {
    execSync(`python -c "from PIL import Image; Image.new('RGB',(224,224),(200,150,180)).save(r'${IMG_PATH}')"`, { stdio: 'inherit' });
    console.log('✅ Test image created:', IMG_PATH);
  } catch(e) {
    console.error('❌ Failed to create test image:', e.message);
    process.exit(1);
  }

  try {
    // STEP 1: Login
    const loginRes = await axios.post(`${BACKEND}/api/auth/login`, {
      email: 'dr.smith@hospital.com',
      password: 'physician123'
    });
    const { token, user } = loginRes.data.data;
    const headers = { Authorization: `Bearer ${token}` };
    console.log(`✅ STEP 1 - Logged in as: ${user.name} (${user.role})`);

    // STEP 2: Check ML service
    const healthRes = await axios.get(`${ML_URL}/health`);
    console.log(`✅ STEP 2 - ML Service health: ${healthRes.data.status} | demo_mode=${healthRes.data.demo_mode}`);

    // STEP 3: Create a case
    const form = new FormData();
    form.append('wsiFile', fs.createReadStream(IMG_PATH), {
      filename: 'test_slide.png',
      contentType: 'image/png'
    });
    form.append('clinicalData', JSON.stringify({
      age: 62, tumor_size: 32, lymph_nodes: 4,
      er_status: 0, pr_status: 0, her2_status: 1,
      grade: 3, ki67: 45, tp53_mutation: 1, brca1_mutation: 0
    }));
    const caseRes = await axios.post(`${BACKEND}/api/cases`, form, {
      headers: { ...form.getHeaders(), ...headers }
    });
    const caseId = caseRes.data.data._id;
    const uuid   = caseRes.data.data.patientUUID;
    console.log(`✅ STEP 3 - Case created! ID=${caseId}`);
    console.log(`           PatientUUID=${uuid}`);

    // STEP 4: Trigger AI analysis
    await axios.post(`${BACKEND}/api/cases/${caseId}/analyze`, {}, { headers });
    console.log('✅ STEP 4 - Analysis triggered (async). Polling for result...');

    // STEP 5: Poll until complete/failed (max 60s)
    let result = null;
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 3000));
      const poll = await axios.get(`${BACKEND}/api/cases/${caseId}`, { headers });
      const status = poll.data.data.status;
      process.stdout.write(`   [${i+1}] Status: ${status}\n`);
      if (status === 'complete') { result = poll.data.data.inferenceResult; break; }
      if (status === 'failed')   { console.error('❌ Analysis failed!'); break; }
    }

    if (result) {
      console.log('\n' + '='.repeat(50));
      console.log('🎉  FULL END-TO-END PIPELINE: SUCCESS!');
      console.log('='.repeat(50));
      console.log(`   Diagnosis:        ${result.diagnosis.toUpperCase()}`);
      console.log(`   Confidence:       ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`   Prognosis Score:  ${(result.prognosisScore * 100).toFixed(1)}%`);
      console.log(`   5yr Survival:     ${(result.survivalProbability * 100).toFixed(1)}%`);
      console.log(`   GradCAM path:     ${result.gradcamImagePath}`);
      console.log(`   SHAP features:    ${Object.keys(result.shapValues || {}).length} features`);
      console.log(`   Processing time:  ${Math.round(result.processingTimeMs)}ms`);
      console.log(`   Model version:    ${result.modelVersion}`);
      console.log('='.repeat(50));
      console.log('\n✅ Open http://localhost:5173 in your browser to see the results!\n');
    }

    // STEP 6: List cases API
    const listRes = await axios.get(`${BACKEND}/api/cases?limit=5`, { headers });
    console.log(`✅ STEP 6 - Cases list OK: ${listRes.data.count} case(s) returned`);

  } catch(e) {
    console.error('\n❌ Test failed:', e.response?.data || e.message);
    process.exit(1);
  } finally {
    if (fs.existsSync(IMG_PATH)) fs.unlinkSync(IMG_PATH);
  }
}

main();
