import {
  ArrowRightOutlined,
  CheckCircleFilled,
  PictureOutlined,
  RobotOutlined,
  SendOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Button, Card, Input, Tag } from "antd";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { StorefrontProduct } from "../../api/storefront/products.api";
import { paths } from "../../routes/paths";
import { formatCurrency, getPrimaryImage, getStartingPrice } from "./productPresentation";
import { advisorSuggestions, createAdvisorReply } from "./advisorPrompts";

interface ChatMessage {
  id: number;
  role: "assistant" | "user";
  content: string;
  products?: StorefrontProduct[];
}

interface AdvisorChatPanelProps {
  products: StorefrontProduct[];
}

function AdvisorProductResult({ product }: { product: StorefrontProduct }) {
  const image = getPrimaryImage(product.images);
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <Link className="advisor-product-result" to={paths.productDetail(product.slug)}>
      <span className="advisor-product-image">
        {image && !imageFailed ? (
          <img
            src={image.url}
            alt={image.alt || product.name}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <PictureOutlined aria-label="Chưa có ảnh" />
        )}
      </span>
      <span className="advisor-product-copy">
        <small>{product.brand.name} · {product.category.name}</small>
        <strong>{product.name}</strong>
        <b>{formatCurrency(getStartingPrice(product))}</b>
      </span>
      <ArrowRightOutlined aria-hidden="true" />
    </Link>
  );
}

export function AdvisorChatPanel({ products }: AdvisorChatPanelProps) {
  const [value, setValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      role: "assistant",
      content: "Chào bạn! Bạn đang tìm vợt, giày hay phụ kiện? Hãy cho mình biết thêm trình độ, lối chơi và khoảng ngân sách nhé.",
    },
  ]);
  const messagesRef = useRef<HTMLDivElement>(null);
  const nextMessageId = useRef(1);

  useEffect(() => {
    messagesRef.current?.scrollTo({ top: messagesRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = (nextValue = value) => {
    const question = nextValue.trim();
    if (!question) return;
    const reply = createAdvisorReply(question, products);
    const messageId = nextMessageId.current;
    nextMessageId.current += 2;
    setMessages((current) => [
      ...current,
      { id: messageId, role: "user", content: question },
      { id: messageId + 1, role: "assistant", content: reply.message, products: reply.products },
    ]);
    setValue("");
  };

  return (
    <Card className="advisor-chat-panel">
      <header className="advisor-chat-header">
        <span className="advisor-chat-avatar"><RobotOutlined /></span>
        <div>
          <h2>Trợ lý chọn dụng cụ</h2>
          <p><i aria-hidden="true" /> Sẵn sàng tra cứu catalog</p>
        </div>
        <Tag icon={<CheckCircleFilled />}>Catalog đã kết nối</Tag>
      </header>

      <div className="advisor-chat-messages" ref={messagesRef} aria-live="polite">
        {messages.map((message) => (
          <article className={`advisor-chat-message ${message.role}`} key={message.id}>
            <span className="advisor-message-avatar">
              {message.role === "assistant" ? <RobotOutlined /> : <UserOutlined />}
            </span>
            <div className="advisor-message-content">
              <p>{message.content}</p>
              {message.products?.length ? (
                <div className="advisor-products">
                  {message.products.map((product) => (
                    <AdvisorProductResult product={product} key={product.id} />
                  ))}
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <footer className="advisor-chat-composer">
        <span className="advisor-suggestion-label">Thử hỏi nhanh</span>
        <div className="advisor-suggestions">
          {advisorSuggestions.map((suggestion) => (
            <button type="button" key={suggestion} onClick={() => send(suggestion)}>
              {suggestion}
            </button>
          ))}
        </div>
        <div className="advisor-chat-input">
          <Input.TextArea
            value={value}
            maxLength={300}
            autoSize={{ minRows: 1, maxRows: 4 }}
            onChange={(event) => setValue(event.target.value)}
            onPressEnter={(event) => {
              if (event.shiftKey) return;
              event.preventDefault();
              send();
            }}
            placeholder="Ví dụ: Tôi mới chơi, cần vợt dễ thuần dưới 2 triệu..."
            aria-label="Nhu cầu tư vấn sản phẩm"
          />
          <Button type="primary" icon={<SendOutlined />} disabled={!value.trim()} onClick={() => send()}>
            Gửi câu hỏi
          </Button>
        </div>
        <p className="advisor-chat-disclaimer">
          Bản thử nghiệm đang đối chiếu từ khóa với catalog, chưa sử dụng mô hình RAG. Bạn nên kiểm tra thông số ở trang chi tiết trước khi mua.
        </p>
      </footer>
    </Card>
  );
}
