import { shareOnWeb } from './share';

describe('shareOnWeb', () => {
  it('공유 메뉴가 있으면 그걸 쓴다', async () => {
    const share = jest.fn(async () => {});
    expect(await shareOnWeb('hi', { share })).toBe('shared');
    expect(share).toHaveBeenCalledWith({ text: 'hi' });
  });

  it('공유 메뉴를 닫아도(취소) 오류로 보지 않는다', async () => {
    const share = async () => {
      throw Object.assign(new Error('cancel'), { name: 'AbortError' });
    };
    expect(await shareOnWeb('hi', { share })).toBe('shared');
  });

  it('공유 메뉴가 없으면 클립보드에 복사한다', async () => {
    const writeText = jest.fn(async () => {});
    expect(await shareOnWeb('hi', { clipboard: { writeText } })).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('hi');
  });

  it('복사도 안 되면 직접 복사하도록 알린다', async () => {
    const writeText = async () => {
      throw new Error('not allowed');
    };
    expect(await shareOnWeb('hi', { clipboard: { writeText } })).toBe('manual');
    expect(await shareOnWeb('hi', undefined)).toBe('manual');
  });
});
