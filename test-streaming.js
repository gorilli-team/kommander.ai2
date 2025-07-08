import fetch from 'node-fetch';

async function testStreaming() {
  try {
    console.log('🧪 Testing streaming endpoint...');
    
    const response = await fetch('http://localhost:9002/api/kommander-query-stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: 'test-user-streaming',
        message: 'Come stai?',
        history: [],
        conversationId: 'test-conv-' + Date.now(),
        site: 'localhost',
      }),
    });

    if (!response.ok) {
      console.error('❌ Response not ok:', response.status, response.statusText);
      return;
    }

    console.log('✅ Connected to streaming endpoint');
    console.log('📡 Starting to read stream...\n');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.trim() && line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.replace(/^data: /, ''));
            
            if (event.type === 'chunk') {
              process.stdout.write(event.content);
              fullResponse += event.content;
            } else if (event.type === 'complete') {
              console.log('\n\n🎉 Stream completed!');
              console.log('📊 Full response length:', fullResponse.length);
              console.log('💬 Full response:', fullResponse);
              if (event.sources && event.sources.length > 0) {
                console.log('📚 Sources used:', event.sources.length);
              }
            } else if (event.type === 'error') {
              console.error('\n❌ Stream error:', event.error);
            }
          } catch (parseError) {
            console.error('❌ Parse error:', parseError.message);
          }
        }
      }
    }

    console.log('\n✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testStreaming();
