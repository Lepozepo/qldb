import QLDB, { ionize } from '../pkg';

describe('package', () => {
  it('exports ionize', () => {
    expect(ionize).toBeInstanceOf(Function);
  });

  it('exports QLDB', () => {
    expect(QLDB).toBeTruthy();
  });
});
