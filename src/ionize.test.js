import { ionize } from './index';

describe('ionize', () => {
  it('can convert objects to ion structs', () => {
    const now = new Date();
    const thing = {
      stuff: 1,
      morestuff: 'more',
      obj: { hi: 1 },
      arr: [1, 2, 3, '4'],
      date: now,
    };
    const thingIon = ionize(thing);
    expect(thingIon).toBe(`{'stuff':1,'morestuff':'more','obj':{'hi':1},'arr':[1,2,3,'4'],'date':\`${now.toISOString()}\`}`);
  });

  it('can convert arrays to ion struct collections', () => {
    const now = new Date();
    const things = [
      {
        stuff: 1,
        morestuff: 'more',
        obj: { hi: 1 },
        arr: [1, 2, 3, '4'],
        date: now,
      },
      {
        stuff: 2,
        morestuff: 'tomato',
        obj: { hi: 2 },
        arr: [0, 3, 2, '4'],
        date: now,
      },
    ];
    const thingIon = ionize(things);
    expect(thingIon).toBe(`<<{'stuff':1,'morestuff':'more','obj':{'hi':1},'arr':[1,2,3,'4'],'date':\`${now.toISOString()}\`},{'stuff':2,'morestuff':'tomato','obj':{'hi':2},'arr':[0,3,2,'4'],'date':\`${now.toISOString()}\`}>>`);
  });
});
