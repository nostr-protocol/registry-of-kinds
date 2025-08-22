import { createSignal, Show, For, onMount } from 'solid-js';
import { createStore } from 'solid-js/store';
import yaml from 'js-yaml';

function App() {
  const [kinds, setKinds] = createStore([]);
  const [searchTerm, setSearchTerm] = createSignal('');
  const [selectedKind, setSelectedKind] = createSignal(null);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal(null);

  // load schema.yaml on mount
  onMount(async () => {
    try {
      const response = await fetch('schema.yaml');
      if (!response.ok) throw new Error('Failed to load schema.yaml');
      const text = await response.text();
      const data = yaml.load(text);

      const kindsList = [];
      for (const [key, value] of Object.entries(data)) {
        // skip anchors (keys starting with _)
        if (key.startsWith('_')) continue;

        kindsList.push({
          number: parseInt(key),
          description: value.description || 'No description',
          content: value.content || 'unknown',
          tags: value.tags || [],
        });
      }

      // sort by kind number
      kindsList.sort((a, b) => a.number - b.number);
      setKinds(kindsList);
      setLoading(false);

      // Load kind from hash if present
      loadKindFromHash();
    } catch (err) {
      console.error('Error loading schema:', err);
      setError(err.message);
      setLoading(false);
    }
  });

  // handle hash routing
  function loadKindFromHash () {
    const hash = window.location.hash;
    if (hash.startsWith('#kind-')) {
      const kindNumber = parseInt(hash.replace('#kind-', ''));
      const kind = kinds.find(k => k.number === kindNumber);
      if (kind) {
        setSelectedKind(kind);
      }
    }
  };

  // Listen for hash changes
  onMount(() => {
    const handleHashChange = () => loadKindFromHash();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  });

  // update hash when kind is selected
  function selectKind (kind) {
    setSelectedKind(kind);
    window.location.hash = `#kind-${kind.number}`;
  };

  function filteredKinds () {
    const term = searchTerm().toLowerCase();
    if (!term) return kinds;

    return kinds.filter(kind =>
      kind.number.toString().includes(term) ||
      kind.description.toLowerCase().includes(term) ||
      kind.tags.map(t => t.name).join('').includes(term)
    );
  };

  function generateExampleJson (kind) {
    const event = {
      id: "<32-bytes lowercase hex>",
      pubkey: "<32-bytes lowercase hex>",
      created_at: Math.floor(Date.now() / 1000),
      kind: kind.number,
      tags: [],
      content: "",
      sig: "<64-bytes-lowercase-hex>"
    };

    // Add example content based on content type
    switch (kind.content) {
      case 'json':
        event.content = JSON.stringify({ json: "text" });
        break;
      case 'free':
        event.content = "<some-text>";
        break;
      case 'empty':
        event.content = "<empty>";
        break;
      default:
        event.content = "<some-text>";
    }

    if (kind.tags && kind.tags.length > 0) {
      for (const tagDef of kind.tags) {
        const tagName = tagDef.name || tagDef.prefix;
        if (tagName) {
          const tag = [tagName];

          let nextDef = tagDef.next;
          while (nextDef) {
            switch (nextDef.type) {
              case 'id':
                tag.push("<32-bytes-lowercase-hex-event-id>");
                break;
              case 'pubkey':
                tag.push("<32-bytes-lowercase-hex-pubkey>");
                break;
              case 'relay':
                tag.push("wss://relay.tld");
                break;
              case 'url':
                tag.push("https://website.tld/path");
                break;
              case 'free':
                tag.push("<some-value>");
                break;
              case 'addr':
                tag.push("<stringified-kind-number>:<lowercase-hex-pubkey>:<d-tag>");
                break;
              case 'constrained':
                if (nextDef.either && nextDef.either.length > 0) {
                  tag.push(nextDef.either[Math.floor(Math.random() * nextDef.either.length)]);
                }
                break;
              case 'kind':
                tag.push("<stringified-kind-number>");
                break;
              default:
                tag.push("<some-value>");
            }

            nextDef = nextDef.next;
          }

          event.tags.push(tag);
        }
      }
    }

    return JSON.stringify(event, null, 2);
  };

  function formatJson (json) {
    return json
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/("[^"]+":)/g, '<span class="font-bold">$1</span>')
      .replace(/(: null)/g, ': <span class="italic">$1</span>');
  };

  return (
    <div class="min-h-screen bg-white text-black font-mono">
      <div class="max-w-7xl mx-auto px-4 py-8">
        <div class="text-center mb-12">
          <h1 class="text-4xl font-bold mb-4">
            Nostr Event Kinds Registry
          </h1>
          <p class="text-lg">
            Browse and explore Nostr protocol event definitions
          </p>
        </div>

        <Show when={loading()}>
          <div class="flex items-center justify-center h-64">
            <div class="text-lg">Loading schema...</div>
          </div>
        </Show>

        <Show when={error()}>
          <div class="border-2 border-black p-6">
            Error: {error()}
          </div>
        </Show>

        <Show when={!loading() && !error()}>
          <div class="mb-8">
            <input
              type="text"
              class="w-full px-4 py-2 bg-white border-2 border-black focus:outline-none"
              placeholder="Search by kind number or description..."
              value={searchTerm()}
              onInput={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div class="bg-white border-2 border-black">
              <div class="max-h-[70vh] overflow-y-auto">
                <table class="w-full">
                  <thead class="sticky top-0 bg-white border-b-2 border-black">
                    <tr>
                      <th class="px-4 py-2 text-left font-bold">
                        Kind
                      </th>
                      <th class="px-4 py-2 text-left font-bold">
                        Description
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-black">
                    <For each={filteredKinds()}>
                      {(kind) => (
                        <tr
                          class={`cursor-pointer hover:bg-gray-200 ${
                            selectedKind()?.number === kind.number
                              ? 'bg-gray-300'
                              : ''
                          }`}
                          onClick={() => selectKind(kind)}
                        >
                          <td class="px-4 py-2">
                            <span class="font-bold">
                              {kind.number}
                            </span>
                          </td>
                          <td class="px-4 py-2">
                            {kind.description}
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="bg-white border-2 border-black p-8 lg:sticky lg:top-8 self-start">
              <Show
                when={selectedKind()}
                fallback={
                  <div class="flex items-center justify-center h-96">
                    Select an event kind to view details
                  </div>
                }
              >
                <h2 class="text-2xl font-bold mb-6">
                  Kind {selectedKind().number}
                </h2>

                <div class="space-y-6">
                  <div>
                    <h3 class="text-sm font-bold mb-2">
                      Description:
                    </h3>
                    <p class="text-lg">
                      {selectedKind().description}
                    </p>
                  </div>

                  <div>
                    <h3 class="text-sm font-bold mb-2">
                      Content Type:
                    </h3>
                    <span class="inline-block px-2 py-1 border border-black font-bold">
                      {selectedKind().content}
                    </span>
                  </div>

                  <Show when={selectedKind().tags && selectedKind().tags.length > 0}>
                    <div>
                      <h3 class="text-sm font-bold mb-3">
                        Supported Tags:
                      </h3>
                      <div class="space-y-2">
                        <For each={selectedKind().tags}>
                          {(tag) => {
                            function getNextTypes (nextSpec) {
                              const types = [];
                              let current = nextSpec;
                              while (current) {
                                let typeInfo = current.type;
                                if (current.type === 'constrained' && current.either) {
                                  typeInfo += ` (${current.either.join(', ')})`;
                                }
                                types.push(typeInfo);
                                current = current.next;
                              }
                              return types;
                            };

                            return (
                              <div class="border border-black p-3">
                                <div class="font-bold">
                                  {tag.name || tag.prefix || 'unnamed'}
                                </div>
                                <Show when={tag.next}>
                                  <div class="text-sm mt-2">
                                    <ul class="list-disc ml-4 space-y-1">
                                      <For each={getNextTypes(tag.next)}>
                                        {(type) => (
                                          <li class="text-sm">{type}</li>
                                        )}
                                      </For>
                                    </ul>
                                  </div>
                                </Show>
                              </div>
                            );
                          }}
                        </For>
                      </div>
                    </div>
                  </Show>

                  <div>
                    <h3 class="text-sm font-bold mb-2">
                      Example JSON Event:
                    </h3>
                    <pre class="bg-black text-white p-4 border border-black overflow-x-auto text-sm font-mono">
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
