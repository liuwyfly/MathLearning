import test from 'node:test';
import assert from 'node:assert/strict';

import { GetContents } from '../../src/routes/contentsViews';

test('GetContents excludes disabled contents from client responses', async () => {
  const prisma = {
    contents: {
      findMany: async (args: unknown) => {
        assert.deepEqual(args, {
          where: { enabled: true },
          orderBy: [
            { sort: 'asc' },
            { id: 'desc' },
          ],
          select: { id: true, name: true, name_en: true, icon_path: true, enabled: true },
        });

        return [
          { id: 1, name: 'visible', name_en: 'visible_en', icon_path: '/icon/visible', enabled: true },
          { id: 2, name: 'hidden', name_en: 'hidden_en', icon_path: '/icon/hidden', enabled: false },
        ];
      },
    },
  };

  const result = await GetContents.call(
    {
      prisma,
      log: { error: () => undefined },
    } as any,
    { query: {} } as any,
    {} as any,
  );

  assert.deepEqual(result, {
    data: [{ id: 1, name: 'visible', icon_path: '/icon/visible' }],
  });
});
