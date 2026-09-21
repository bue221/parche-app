import { eventDetailImages, lightboxCanPage, lightboxPageSize } from '@/lib/event-images';

describe('eventDetailImages', () => {
  test('puts the flyer first and skips gallery urls that repeat it', () => {
    const images = eventDetailImages({
      flyerUrl: 'https://cdn.parche/flyer.jpg',
      gallery: [
        { id: 'g1', url: 'https://cdn.parche/flyer.jpg' },
        { id: 'g2', url: 'https://cdn.parche/two.jpg' },
      ],
    });
    expect(images.map((image) => image.id)).toEqual(['flyer', 'g2']);
  });

  test('skips empty gallery urls', () => {
    expect(eventDetailImages({ gallery: [{ id: 'g1', url: '' }] })).toEqual([]);
  });
});

describe('lightboxCanPage', () => {
  test('a zero-height stage is not ready to page, so web cannot hide the photo', () => {
    expect(lightboxCanPage(4, lightboxPageSize(720, 0))).toBe(false);
    expect(lightboxCanPage(4, lightboxPageSize(0, 900))).toBe(false);
  });

  test('one photo never pages', () => {
    expect(lightboxCanPage(1, lightboxPageSize(720, 900))).toBe(false);
  });

  test('several photos page once the stage has a real box', () => {
    expect(lightboxCanPage(4, lightboxPageSize(720.4, 900.6))).toBe(true);
    expect(lightboxPageSize(720.4, 900.6)).toEqual({ width: 720, height: 901 });
  });
});
