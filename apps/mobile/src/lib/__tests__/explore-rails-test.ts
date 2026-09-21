import {
  exploreShowsForYouRail,
  exploreShowsGenreRails,
  exploreShowsTonightRail,
} from '@/lib/explore-rails';

describe('exploreShowsTonightRail', () => {
  test('desktop catalog never shows the tonight rail', () => {
    expect(exploreShowsTonightRail({ count: 0, loading: false, wide: true })).toBe(false);
    expect(exploreShowsTonightRail({ count: 2, loading: false, wide: true })).toBe(false);
    expect(exploreShowsTonightRail({ count: 0, loading: true, wide: true })).toBe(false);
  });

  test('phone keeps the empty tonight title', () => {
    expect(exploreShowsTonightRail({ count: 0, loading: false, wide: false })).toBe(true);
  });

  test('a live night stays on the phone home', () => {
    expect(exploreShowsTonightRail({ count: 2, loading: false, wide: false })).toBe(true);
  });
});

describe('exploreShowsGenreRails', () => {
  test('desktop catalog skips genre rails — chips already filter the grid', () => {
    expect(exploreShowsGenreRails(true)).toBe(false);
  });

  test('phone keeps genre rails until a genre chip is on', () => {
    expect(exploreShowsGenreRails(false)).toBe(true);
    expect(exploreShowsGenreRails(false, 'techno')).toBe(false);
  });
});

describe('exploreShowsForYouRail', () => {
  test('Para ti only lives on the phone home', () => {
    expect(exploreShowsForYouRail(true)).toBe(false);
    expect(exploreShowsForYouRail(false)).toBe(true);
  });
});
