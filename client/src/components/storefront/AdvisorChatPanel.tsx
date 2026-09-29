import { RobotOutlined, SendOutlined, UserOutlined } from "@ant-design/icons";
import { Button, Card, Input, Tag } from "antd";
import { useState } from "react";
import { Link } from "react-router-dom";
import type { StorefrontProduct } from "../../api/storefront/products.api";
import { paths } from "../../routes/paths";
import { formatCurrency, getStartingPrice } from "./productPresentation";
import { advisorSuggestions, createAdvisorReply } from "./advisorPrompts";

interface ChatMessage { id: number; role: "assistant" | "user"; content: string; products?: StorefrontProduct[]; }
interface AdvisorChatPanelProps { products: StorefrontProduct[]; }

export function AdvisorChatPanel({ products }: AdvisorChatPanelProps) {
  const [value, setValue] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([{ id: 0, role: "assistant", content: "Chào bạn! Hãy cho mình biết bạn đang tìm vợt, giày hay phụ kiện; kèm trình độ hoặc ngân sách nếu có." }]);
  const send = (nextValue = value) => {
    const question = nextValue.trim();
    if (!question) return;
    const reply = createAdvisorReply(question, products);
    setMessages((current) => [...current, { id: Date.now(), role: "user", content: question }, { id: Date.now() + 1, role: "assistant", content: reply.message, products: reply.products }]);
    setValue("");
  };

  return (
    <Card className="advisor-chat-panel">
      <div className="advisor-chat-header"><span><RobotOutlined /></span><div><h2>Trợ lý chọn dụng cụ</h2><p>Gợi ý dựa trên danh mục sản phẩm hiện có.</p></div><Tag>Preview</Tag></div>
      <div className="advisor-chat-messages">
        {messages.map((message) => <div className={`advisor-chat-message ${message.role}`} key={message.id}><span>{message.role === "assistant" ? <RobotOutlined /> : <UserOutlined />}</span><div><p>{message.content}</p>{message.products?.length ? <div className="advisor-products">{message.products.map((product) => <Link to={paths.productDetail(product.slug)} key={product.id}><strong>{product.name}</strong><small>{product.brand.name} · {formatCurrency(getStartingPrice(product))}</small></Link>)}</div> : null}</div></div>)}
      </div>
      <div className="advisor-suggestions">{advisorSuggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => send(suggestion)}>{suggestion}</button>)}</div>
      <div className="advisor-chat-input"><Input value={value} maxLength={300} onChange={(event) => setValue(event.target.value)} onPressEnter={() => send()} placeholder="Ví dụ: Tôi cần vợt công thủ toàn diện dưới 2 triệu" /><Button type="primary" icon={<SendOutlined />} onClick={() => send()}>Gửi</Button></div>
      <p className="advisor-chat-disclaimer">Đây là gợi ý tìm kiếm phía giao diện, chưa phải chatbot RAG. Hãy kiểm tra trang chi tiết sản phẩm trước khi mua.</p>
    </Card>
  );
}
