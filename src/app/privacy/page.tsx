import Link from "next/link";
import { HELP_LINES } from "@/lib/crisis";

export const metadata = { title: "Политика конфиденциальности · FocusAI" };

const CONTACT = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
const UPDATED = "21 ноября 2026";

/** Public page (no consent needed): required for Google Play and for trust. */
export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl px-4 py-8 md:py-12">
      <Link href="/" className="inline-flex min-h-11 items-center font-semibold text-navy underline underline-offset-4">
        ← FocusAI
      </Link>
      <h1 className="title mt-4 text-3xl">
        Политика
        <span className="block text-accent">конфиденциальности</span>
      </h1>
      <p className="mt-2 text-sm text-muted">Обновлено: {UPDATED}</p>

      <div className="card mt-6 space-y-5 p-5 text-ink md:p-6 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-extrabold [&_h2]:text-navy">
        <section>
          <h2>Коротко</h2>
          <p className="mt-1">
            FocusAI не собирает ваши данные. Ответы чек-ина, заметки, результаты тестов и настройки хранятся только на
            вашем устройстве. У приложения нет аккаунтов и сервера, куда эти данные отправлялись бы.
          </p>
        </section>
        <section>
          <h2>Что хранится на устройстве</h2>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            <li>ответы ежедневного чек-ина и необязательные заметки;</li>
            <li>результаты теста внимания (Focus Score);</li>
            <li>завершённые фокус-сессии (дата, время начала, длительность);</li>
            <li>режим «Учусь/Работаю», дата согласия, эксперименты недели.</li>
          </ul>
          <p className="mt-2">
            Данные лежат в хранилище браузера или приложения (IndexedDB). Мы не видим их и не можем восстановить.
          </p>
        </section>
        <section>
          <h2>Что мы не делаем</h2>
          <p className="mt-1">
            Не используем рекламу, трекеры, cookies для аналитики, не продаём и не передаём данные третьим лицам.
          </p>
        </section>
        <section>
          <h2>Технические журналы хостинга</h2>
          <p className="mt-1">
            Как и любой сайт, хостинг может вести стандартные журналы запросов (например, IP-адрес и время загрузки
            страницы). Ваши ответы и результаты в эти запросы не входят.
          </p>
        </section>
        <section>
          <h2>Напоминание в календаре</h2>
          <p className="mt-1">
            Если вы нажмёте «Google Календарь», откроется сайт Google с готовым событием: в нём только выбранное время,
            ежедневный повтор, название «FocusAI: чек-ин за 1 минуту» и ссылка на приложение. Файл .ics создаётся на устройстве и никуда не отправляется.
          </p>
        </section>
        <section>
          <h2>Telegram</h2>
          <p className="mt-1">
            Если вы открываете FocusAI в Telegram, Telegram может передавать приложению сведения о вашем аккаунте. FocusAI
            их не читает и не сохраняет.
          </p>
        </section>
        <section>
          <h2>Ваши права</h2>
          <p className="mt-1">
            В «Настройках» можно выгрузить все данные в файл («Экспорт данных»), перенести их на другое устройство
            («Импорт данных») или удалить их навсегда («Удалить все данные»). Удаление приложения или очистка данных
            браузера тоже удаляет всё.
          </p>
        </section>
        <section>
          <h2>Не медицинская помощь</h2>
          <p className="mt-1">
            FocusAI не является медицинской консультацией и не ставит диагнозов. Если тяжело, бесплатно поговорить можно по
            номерам {HELP_LINES.map((l) => l.phone).join(" и ")} или с психологом вашего вуза.
          </p>
        </section>
        {CONTACT && (
          <section>
            <h2>Связь</h2>
            <p className="mt-1">
              Вопросы о приватности: <a href={`mailto:${CONTACT}`} className="font-semibold text-navy underline">{CONTACT}</a>
            </p>
          </section>
        )}
      </div>
    </article>
  );
}
