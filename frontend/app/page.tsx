import AlbumBrowser from "@/components/AlbumBrowser";
import { parseFilter } from "@/lib/filter";
import { getAlbums } from "@/lib/api";

export default async function Home({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const { cat } = await searchParams;
  const albums = await getAlbums();
  const songCount = albums.reduce((n, a) => n + a.songs.length, 0);

  return (
    <main className="shell">
      <header className="home-head">
        <h1>IU 應援歌單</h1>
        <p className="muted">
          {albums.length} 張專輯與單曲、{songCount} 首歌。選一首歌，邊看影片邊跟著歌詞和應援法練習。
        </p>
      </header>
      <AlbumBrowser albums={albums} initialFilter={parseFilter(cat)} />
    </main>
  );
}
