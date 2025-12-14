import { Entity, PrimaryKey, Property } from "@mikro-orm/core";

@Entity()
export class Post {
  @PrimaryKey()
  id!: number;

  @Property()
  title!: string;

  @Property({ type: "text" })
  content!: string;

  @Property()
  slug!: string;

  @Property()
  viewCount!: number;

  @Property({ type: "array" })
  tags!: string[];

  @Property()
  isPublished!: boolean;

  @Property({ nullable: true })
  publishedAt!: Date | null;

  @Property()
  authorId!: number;

  @Property()
  createdAt!: Date;
}
