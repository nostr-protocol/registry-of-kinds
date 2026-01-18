import { For } from "solid-js"

export function EventJSON(props) {
  return (
    <div class="text-sm font-mono">
      <div class="text-white">{"{"}</div>

      <div class="ml-4">
        <div class="flex">
          <span class="text-gray-400 font-bold">"id":</span>
          <span class="ml-2 text-white">"{props.event.id}"</span>
        </div>

        <div class="flex">
          <span class="text-gray-400 font-bold">"pubkey":</span>
          <span class="ml-2 text-white">"{props.event.pubkey}"</span>
        </div>

        <div class="flex">
          <span class="text-gray-400 font-bold">"created_at":</span>
          <span class="ml-2 text-white">{props.event.created_at}</span>
        </div>

        <div class="flex">
          <span class="text-gray-400 font-bold">"kind":</span>
          <span class="ml-2 text-white">{props.event.kind}</span>
        </div>

        <div>
          <span class="text-gray-400 font-bold">"tags":</span>
          <span class="text-white"> [</span>
          <For each={props.event.tags}>
            {tag => (
              <>
                <div class="ml-4 text-gray-400">{JSON.stringify(tag)}</div>
              </>
            )}
          </For>
          <span class="text-white">]</span>
        </div>

        <div class="flex">
          <span class="text-gray-400 font-bold">"content":</span>
          <span class="ml-2 text-white">{JSON.stringify(props.event.content)}</span>
        </div>

        <div class="flex">
          <span class="text-gray-400 font-bold">"sig":</span>
          <span class="ml-2 text-white">"{props.event.sig}"</span>
        </div>
      </div>

      <div class="text-white">{"}"}</div>
    </div>
  )
}
