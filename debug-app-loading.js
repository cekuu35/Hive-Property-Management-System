import fetch from 'node-fetch';

const debugAppLoading = async () => {
  console.log('🔍 Debugging App Loading Issues\n');
  console.log('=' .repeat(50));
  
  try {
    // Test if the app is accessible
    console.log('1️⃣ Testing app accessibility...');
    const response = await fetch('http://localhost:5173');
    
    if (response.ok) {
      console.log('✅ App is accessible on http://localhost:5173');
      console.log('   Status:', response.status);
      console.log('   Content-Type:', response.headers.get('content-type'));
    } else {
      console.log('❌ App not accessible:', response.status);
      return;
    }
    
    // Test backend health
    console.log('\n2️⃣ Testing backend health...');
    const backendResponse = await fetch('http://localhost:3001/api/health');
    
    if (backendResponse.ok) {
      const backendData = await backendResponse.json();
      console.log('✅ Backend is healthy');
      console.log('   Available endpoints:', backendData.endpoints?.length || 'Multiple');
    } else {
      console.log('❌ Backend not responding');
    }
    
    // Test Supabase connection
    console.log('\n3️⃣ Testing Supabase connection...');
    const supabaseResponse = await fetch('http://localhost:3001/api/health');
    
    if (supabaseResponse.ok) {
      console.log('✅ Supabase connection should be working');
    } else {
      console.log('❌ Supabase connection issue');
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎯 Debugging Complete!');
    console.log('\n💡 Common Issues and Solutions:');
    console.log('1. Blank white screen usually means:');
    console.log('   - JavaScript error preventing render');
    console.log('   - Missing dependencies');
    console.log('   - Supabase connection issues');
    console.log('   - Authentication flow problems');
    
    console.log('\n2. Check browser console for errors:');
    console.log('   - Open Developer Tools (F12)');
    console.log('   - Look at Console tab for red errors');
    console.log('   - Check Network tab for failed requests');
    
    console.log('\n3. Try these solutions:');
    console.log('   - Hard refresh: Ctrl+Shift+R');
    console.log('   - Clear browser cache');
    console.log('   - Check if all dependencies are installed');
    console.log('   - Verify Supabase credentials');
    
    console.log('\n🚀 Your app should be working at:');
    console.log('   Frontend: http://localhost:5173');
    console.log('   Backend:  http://localhost:3001');
    
  } catch (error) {
    console.error('❌ Error during debugging:', error.message);
  }
};

debugAppLoading();

