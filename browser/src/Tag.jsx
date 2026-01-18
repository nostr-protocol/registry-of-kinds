export function Tag(props) {
  const tagName = props.tag.name || props.tag.prefix || "unnamed"
  const isMultiple = props.kind.multiple && props.kind.multiple.includes(tagName)
  const isRequired = props.kind.required && props.kind.required.includes(tagName)

  const nextTypes = () => {
    const types = []
    let current = props.tag.next
    while (current) {
      types.push({
        type: current.type,
        either: current.either,
        variadic: current.variadic,
        required: current.required
      })
      current = current.next
    }
    return types
  }

  return (
    <div class="border border-black p-3">
      <div class="flex gap-2 items-center">
        <div class="w-4">[</div>
        <Show when={isMultiple}>
          <div class="text-xs bg-blue-200 px-2 py-0.5 border border-black">multiple</div>
        </Show>
        <Show when={isRequired}>
          <div class="text-xs bg-red-200 px-2 py-0.5 border border-black">required</div>
        </Show>
        <Show when={props.tag.description}>
          <div class="text-sm italic pl-2">{props.tag.description}</div>
        </Show>
      </div>
      <div class="flex items-center gap-2 mt-1">
        <div class="ml-6">
          <div class="font-bold">
            "{tagName}"<Show when={nextTypes().length}>,</Show>
          </div>
        </div>
        <div class="flex items-center gap-2 ml-4"></div>
      </div>
      <For each={nextTypes()}>
        {(type, i) => (
          <div class="flex items-center gap-2 mt-1">
            <div class="ml-6 text-sm">
              "&lt;{type.type}&gt;"<Show when={i() + 1 < nextTypes().length}>,</Show>
              <Show when={type.variadic}>
                , <span title="variadic, takes any number of items in the same tag">...</span>
              </Show>
            </div>
            <Show when={type.constrained}>
              <div class="text-sm pl-2">
                (`${type.either[0]}`<For each={type.either.slice(1)}>{e => `, ${e}`}</For>)
              </div>
            </Show>
            <Show when={type.required}>
              <div class="text-sm pl-2">
                <div class="text-xs bg-red-100 px-2 py-0.5 box-border border border-red-200">
                  required
                </div>
              </div>
            </Show>
          </div>
        )}
      </For>
      <div class="flex items-center gap-2 mt-1">
        <div class="pt-2">]</div>
      </div>
    </div>
  )
}
