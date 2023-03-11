import {hasMatch, positions, score} from "./fzy.js";
import {
  BaseFilter,
  DduItem,
} from "https://deno.land/x/ddu_vim@v0.14/types.ts";
import {Denops} from "https://deno.land/x/ddu_vim@v0.14/deps.ts";

type Params = {
  hlGroup: string;
};

type SortItem = {
  score: number;
  item: DduItem;
};

const te = new TextEncoder();
function utf8Length(str: string): number {
  return te.encode(str).length;
}

export class Filter extends BaseFilter<Params> {
  filter(args: {
    denops: Denops;
    input: string;
    items: DduItem[];
    filterParams: Params;
  }): Promise<DduItem[]> {
    const input = args.input;
    if (!input.length) {
      return Promise.resolve(args.items.map((item) => {
        item.highlights = item.highlights?.filter((h) =>
          h.name != "ddu_fzy_hl"
        );
        return item;
      }));
    }
    const filtered = args.items.filter((i) => hasMatch(input, i.word));
    if (filtered.length > 10000) {
      return Promise.resolve(filtered);
    }
    return Promise.resolve(
      filtered.map((
        c,
      ) => ({ score: score(input, c.word), item: c } as SortItem))
        .sort((a, b) => b.score - a.score).map((c) => {
          const hlOffset = c.item.display === undefined
            ? 0
            : c.item.display.indexOf(c.item.word);
          if (hlOffset >= 0) {
            const display = c.item.display ?? c.item.word;
            const prev = c.item.highlights?.filter((h) => h.name != "ddu_fzy_hl");
            const highlights = positions(input, c.item.word).map((p) => ({
              col: utf8Length(display.substring(0, hlOffset + p)) + 1,
              type: "abbr",
              name: "ddu_fzy_hl",
              "hl_group": args.filterParams.hlGroup,
              width: 1,
            }));
            if (prev) {
              c.item.highlights = prev.concat(highlights);
            } else {
              c.item.highlights = highlights;
            }
          }
          return c.item;
        }),
    );
  }

  params(): Params {
    return {
      hlGroup: "Title",
    };
  }
}
