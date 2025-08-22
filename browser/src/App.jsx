import { createSignal, createEffect, Show, For, onMount } from 'solid-js';
import { createStore } from 'solid-js/store';
import yaml from 'js-yaml';

function App() {
  const [kinds, setKinds] = createStore([]);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [selectedKind, setSelectedKind] = createSignal(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal(null);

  // Load schema.yaml on mount
  onMount(async () => {
    try {
      const response = await fetch('/schema.yaml');
      if (!response.ok) throw new Error('Failed to load schema.yaml');
      const text = await response.text();
      const data = yaml.load(text);

      // Transform the schema into an array of kinds
      const kindsList = [];
      for (const [key, value] of Object.entries(data)) {
        // Skip aliases (keys starting with _)
        if (key.startsWith('_')) continue;

        kindsList.push({
          number: parseInt(key),
          description: value.description || 'No description',
          content: value.content || 'unknown',
          tags: value.tags || [],
        });
      }

      // Sort by kind number
      kindsList.sort((a, b) => a.number - b.number);
      setKinds(kindsList);
      setLoading(false);
    } catch (err) {
      console.error('Error loading schema:', err);
      setError(err.message);
      setLoading(false);
    }
  });

  // Filter kinds based on search term
  const filteredKinds = () => {
    const term = searchTerm().toLowerCase();
    if (!term) return kinds;

    return kinds.filter(kind =>
      kind.number.toString().includes(term) ||
      kind.description.toLowerCase().includes(term)
    );
  };

  // Generate example JSON for selected kind
  const generateExampleJson = (kind) => {
    const event = {
      id: "<32-bytes lowercase hex>",
      pubkey: "<32-bytes lowercase hex>",
      created_at: Math.floor(Date.now() / 1000),
      kind: kind.number,
      tags: [],
      content: "",
      sig: "<64-bytes lowercase hex>"
    };

    // Add example content based on content type
    switch (kind.content) {
      case 'json':
        event.content = JSON.stringify({ example: "data" });
        break;
      case 'free':
        event.content = "Example text content";
        break;
      case 'empty':
        event.content = "";
        break;
      default:
        event.content = "";
    }

    // Add example tags
    if (kind.tags && kind.tags.length > 0) {
      for (const tagDef of kind.tags) {
        const tagName = tagDef.name || tagDef.prefix;
        if (tagName) {
          const tag = [tagName];

          // Add example values based on tag type
          if (tagDef.next) {
            switch (tagDef.next.type) {
              case 'id':
                tag.push("<event-id>");
                break;
              case 'pubkey':
                tag.push("<pubkey>");
                break;
              case 'relay':
                tag.push("wss://relay.example.com");
                break;
              case 'url':
                tag.push("https://example.com");
                break;
              case 'free':
                tag.push("example value");
                break;
              case 'addr':
                tag.push("<kind>:<pubkey>:<d-tag>");
                break;
              case 'kind':
                tag.push("1");
                break;
              default:
                tag.push("value");
            }

            // Add more values if there are nested 'next' properties
            let nextDef = tagDef.next.next;
            while (nextDef) {
              switch (nextDef.type) {
                case 'relay':
                  tag.push("wss://relay.example.com");
                  break;
                case 'constrained':
                  if (nextDef.either && nextDef.either.length > 0) {
                    tag.push(nextDef.either[0]);
                  }
                  break;
                case 'free':
                  tag.push("value");
                  break;
                case 'pubkey':
                  tag.push("<pubkey>");
                  break;
                default:
                  if (nextDef.type) tag.push(nextDef.type);
              }
              nextDef = nextDef.next;
            }
          }

          event.tags.push(tag);
        }
      }
    }

    return JSON.stringify(event, null, 2);
  };

  // Format JSON with syntax highlighting
  const formatJson = (json) => {
    return json
      .replace(/("[^"]+":)/g, '<span class="text-purple-400">$1</span>')
      .replace(/(: "[^"]*")/g, ': <span class="text-green-400">$1</span>')
      .replace(/(: \d+)/g, ': <span class="text-yellow-400">$1</span>')
      .replace(/(: null)/g, ': <span class="text-red-400">$1</span>');
  };

  return (
    <div class="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div class="text-center mb-12">
          <h1 class="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Nostr Event Kinds Registry
          </h1>
          <p class="text-gray-600 text-lg">
            Browse and explore Nostr protocol event definitions
          </p>
        </div>

        <Show when={loading()}>
          <div class="flex items-center justify-center h-64">
            <div class="text-gray-600 text-lg">Loading schema...</div>
          </div>
        </Show>

        <Show when={error()}>
          <div class="bg-red-50 border border-red-200 rounded-lg p-6 text-red-800">
            Error: {error()}
          </div>
        </Show>

        <Show when={!loading() && !error()}>
          <div class="mb-8">
            <input
              type="text"
              class="w-full px-6 py-3 text-gray-700 bg-white border-2 border-gray-200 rounded-xl shadow-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200 transition-all placeholder-gray-400"
              placeholder="Search by kind number or description..."
              value={searchTerm()}
              onInput={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
              <div class="max-h-[70vh] overflow-y-auto">
                <table class="w-full">
                  <thead class="sticky top-0 bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Kind
                      </th>
                      <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100">
                    <For each={filteredKinds()}>
                      {(kind) => (
                        <tr
                          class={`cursor-pointer transition-colors hover:bg-purple-50 ${
                            selectedKind()?.number === kind.number
                              ? 'bg-purple-100 hover:bg-purple-100'
                              : ''
                          }`}
                          onClick={() => setSelectedKind(kind)}
                        >
                          <td class="px-6 py-4">
                            <span class="font-mono font-semibold text-purple-600">
                              {kind.number}
                            </span>
                          </td>
                          <td class="px-6 py-4 text-gray-700">
                            {kind.description}
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="bg-white rounded-xl shadow-lg border border-gray-100 p-8 lg:sticky lg:top-8 self-start">
              <Show
                when={selectedKind()}
                fallback={
                  <div class="flex items-center justify-center h-96 text-gray-400">
                    Select an event kind to view details
                  </div>
                }
              >
                <h2 class="text-2xl font-bold text-gray-800 mb-6">
                  Kind {selectedKind().number}
                </h2>

                <div class="space-y-6">
                  <div>
                    <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Description
                    </h3>
                    <p class="text-gray-700 text-lg">
                      {selectedKind().description}
                    </p>
                  </div>

                  <div>
                    <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Content Type
                    </h3>
                    <span class="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-md font-medium">
                      {selectedKind().content}
                    </span>
                  </div>

                  <Show when={selectedKind().tags && selectedKind().tags.length > 0}>
                    <div>
                      <h3 class="text-sm font-semibold text-gray-700 mb-3">
                        Supported Tags
                      </h3>
                      <div class="space-y-2">
                        <For each={selectedKind().tags}>
                          {(tag) => (
                            <div class="bg-gray-50 border border-gray-200 rounded-lg p-3">
                              <div class="font-semibold text-purple-600">
                                {tag.name || 'unnamed'}
                              </div>
                              <Show when={tag.next}>
                                <div class="text-sm text-gray-600 mt-1">
                                  Type: {tag.next.type}
                                  {tag.next.required && ' (required)'}
                                </div>
                              </Show>
                            </div>
                          )}
                        </For>
                      </div>
                    </div>
                  </Show>

                  <div>
                    <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Example JSON Event
                    </h3>
                    <pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono">
                      <code innerHTML={formatJson(generateExampleJson(selectedKind()))} />
                    </pre>
                  </div>
                </div>
              </Show>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}

export default App;
