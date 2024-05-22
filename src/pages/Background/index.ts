// chrome.storage.local.get(['description'], function (result) {
//   console.log('Value currently is ' + result.description);
// });

interface Message {
  role: string;
  content: string;
}

interface ApiResponse {
  choices: Array<{ message: { content: string } }>;
}

async function fetchFromApi(description: string): Promise<ApiResponse> {
  const apiKey = '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';
  const apiUrl = 'https://api.groq.com/openai/v1/chat/completions';

  const messages: Message[] = [
    {
      role: 'system',
      content:
        'You will Generate Job Propsal Of A Given Text. You can only Generate a job Propsal.Nothing  to Add any line that is not related to Job Propsal.',
    },
    { role: 'user', content: description },
  ];

  if (!apiUrl) {
    throw new Error('API URL is not defined.');
  }

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      model: 'mixtral-8x7b-32768',
      temperature: 1,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    throw new Error(`Error: ${response.status} - ${response.statusText}`);
  }

  return response.json();
}

async function dataFromApi(description: string): Promise<string> {
  try {
    const data = await fetchFromApi(description);
    let response =
      data.choices[0]?.message?.content || 'No response from Groq AI.';
    response = response.replace('Job Proposal:', '');
    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    throw new Error('An error occurred while fetching the data.');
  }
}

let isRequestPending = false;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.description) {
    if (isRequestPending) {
      sendResponse('Response is already generating...');
      return;
    }

    isRequestPending = true;

    dataFromApi(request.description)
      .then((jobpropsal) => {
        console.log(jobpropsal);
        sendResponse(jobpropsal);
        isRequestPending = false;
      })
      .catch((error) => {
        console.error(error);
        sendResponse('An error occurred.');
        isRequestPending = false;
      });

    return true;
  }
});
