import { router, type Href } from 'expo-router';
import { useEffect, useState } from 'react';

import { EmptyState } from '@/components/feedback';
import { Screen } from '@/components/screen';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import type { EditorialPost } from '@/data/types';

export default function PostsFeedScreen() {
  const [posts, setPosts] = useState<EditorialPost[]>([]);

  useEffect(() => {
    void api.feed.posts().then(setPosts);
  }, []);

  return (
    <Screen>
      <Text variant="heading">Notas</Text>
      {posts.length === 0 ? <EmptyState title="Pronto hay notas" /> : null}
      {posts.map((post) => (
        <Text
          key={post.id}
          className="mt-ds-24"
          variant="subheading"
          onPress={() => router.push(`/posts/${post.id}` as Href)}>
          {post.title}
        </Text>
      ))}
    </Screen>
  );
}
