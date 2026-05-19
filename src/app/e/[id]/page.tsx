import EventClient from "./EventClient";

export default async function EventPage(props: PageProps<"/e/[id]">) {
  const { id } = await props.params;
  return <EventClient id={id} />;
}
