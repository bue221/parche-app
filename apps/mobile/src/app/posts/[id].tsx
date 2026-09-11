import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { ErrorState } from '@/components/feedback';
import { Screen } from '@/components/screen';
import { Text } from '@/components/ui/text';
import { api } from '@/data/client';
import { userMessage } from '@/data/errors';
import type { EditorialPost } from '@/data/types';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [post, setPost] = useState<EditorialPost | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void api.feed
      .post(id)
      .then(setPost)
      .catch((err) => setError(userMessage(err)));
  }, [id]);

  if (error) {
    return (
      <Screen>
        <ErrorState message={error} />
      </Screen>
    );
  }

  return (
    <Screen>
      {post?.flyerUrl ? (
        <Image source={{ uri: post.flyerUrl }} className="mb-ds-16 aspect-[16/9] w-full rounded-images" />
      ) : null}
      <Text variant="heading">{post?.title}</Text>
      <Text className="mt-ds-16">{post?.body}</Text>
    </Screen>
  );
}
